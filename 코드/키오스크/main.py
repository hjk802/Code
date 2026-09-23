import threading
import time
import subprocess
import platform
import re

import tkinter as tk
from PIL import ImageTk
import qrcode

from config import *
import api_handler
import hardware_handler
import weight_handler
from camera import capture_image
from ai_classifier import classify

class QRKioskApp:
    def __init__(self):
        self.city =  "Unknown"
        self.is_processing = False
        self.countdown = 30
        self.qr_image_tk = None
        self.thresholds = []

        self.root = tk.Tk()
        self.root.title("QR 키오스크")
        self.root.geometry("500x600")
        self.root.configure(bg="white")

        self.main_label = tk.Label(self.root, text=MSG_IDLE, font=("Helvetica", 20, "bold"), bg="white", fg="black")
        self.main_label.pack(expand=True, fill="both")

        self.status_label = tk.Label(self.root, text="", font=("Helvetica", 14), bg="white", fg="red")
        self.status_label.pack(pady=20)

        self.main_label.bind("<Button-1>", self.on_screen_touch)

        self.thresholds = api_handler.request_thresholds()
        self.policies = api_handler.request_policies()
        self.city = api_handler.request_city()

        self.start_heartbeat()
        self.start_full_watcher()
        self.root.after(3000, lambda: self.main_label.event_generate("<Button-1>"))
        self.root.mainloop()
    
    def get_wifi_rssi(self):
        try:
            system = platform.system()
            if system == "Linux":
                cmd = "iwconfig wlan0 | grep -i 'Signal level'"
                res = subprocess.check_output(cmd, shell=True).decode('utf-8')
                signal = re.search(r"level=(-\d+)", res)
                return int(signal.group(1)) if signal else 0
            elif system == "Darwin":
                cmd = "/usr/sbin/system_profiler SPAirPortDataType | grep 'Signal / Noise'"
                res = subprocess.check_output(cmd, shell=True).decode('utf-8')
                signal = re.search(r"(-\d+)\s+dBm", res)
                return int(signal.group(1)) if signal else 0
            return 0
        except Exception as e:
            return 0

    def start_heartbeat(self):
        def heartbeat():
            while True:
                rssi = self.get_wifi_rssi()
                is_connected = api_handler.request_heartbeat(rssi)
                if is_connected:
                    if self.main_label.cget("text") == MSG_MAINTENANCE:
                        self.root.after(0, lambda: self.reset_ui(MSG_IDLE))
                else:
                    self.root.after(0, self.show_maintenance_mode)
                time.sleep(60)
        t = threading.Thread(target=heartbeat, daemon=True)
        t.start()

    def show_maintenance_mode(self):
        if self.main_label.cget("text") != MSG_MAINTENANCE:
            self.main_label.config(text=MSG_MAINTENANCE, image="")
            self.is_processing = True

    def check_loop(self):
        current_status = api_handler.request_check_loop(self.is_processing)
        if current_status == "RUNNING":
            self.start_operation()
            return
        if self.countdown <= 0:
            self.reset_ui(MSG_TIMEOUT)
            return
        self.status_label.config(text= f"스캔 대기 중... {self.countdown}초")
        self.countdown -= 1
        self.root.after(1000, self.check_loop)

    def on_screen_touch(self, event):
        if self.is_processing: return
        self.is_processing = True
        
        self.main_label.config(text="토큰 요청 중...", image="")
        self.root.update_idletasks()
        token = api_handler.get_token()
        if token:
            self.show_qr(token)
            self.countdown = 30
            self.check_loop()
        else:
            self.reset_ui("서버 연결 실패")
            
    def show_qr(self, token):
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(token)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        self.qr_image_tk = ImageTk.PhotoImage(image=img)
        self.main_label.config(
            text=str(token),                 
            image=self.qr_image_tk,    
            compound="top",             
            font=("Arial", 12)     
        )
        self.main_label.image = self.qr_image_tk 

    def start_operation(self):
        self.main_label.config(text="스캔 성공!\n쓰레기를 투입하세요.", image="")
        self.status_label.config(text=MSG_INPUT_WAIT)
        self.input_timeout = 21
        self.check_input_loop()

    def check_input_loop(self):
        if self.input_timeout <= 0:
            self.reset_ui(MSG_TIMEOUT)
            return
        is_inserted = hardware_handler.request_insert()
        if is_inserted == "OK":
            self.process_waste()
        else:
            self.input_timeout -= 1
            self.status_label.config(text=f"{MSG_INPUT_WAIT} ({self.input_timeout}초)")
            self.root.after(1000, self.check_input_loop)

    def process_waste(self):
        self.main_label.config(text="처리 중입니다...", image="")
        self.status_label.config(text="잠시만 기다려주세요.")
        self.root.update_idletasks()

        # [하드웨어 작동 시뮬레이션]
        reason = None
        weight=-1
        times=10
        while(weight<0 or times<0):
            weight = weight_handler.request_weight()
            times-=1
        if(weight<0):
            weight=1
        if weight>50:
            result="reject"
            reason="notempty"
        else:
            # 사진 촬영
            image = capture_image()
            # AI 분류 result["first_class"], result["second_class"]
            result = classify(image)
            print(result)
            if  result["second_class"] != "normal":
                if result["first_class"] == "exception":
                    reason="etc"
                elif result["second_class"]=="label":
                    reason="label"
                else :
                    reason="pollution"
                result="reject"
            else:
                if result["first_class"] == "color_p":
                    result = "opa_pet"
                elif result["first_class"] == "clear_p":
                    result = "trans_pet"
                else:
                    result = "can"
        hardware_handler.rotate(result)
        time.sleep(3)
        hardware_handler.open_gate()
        level_pct = hardware_handler.request_levels()
        hardware_handler.home()
        # [하드웨어 작동 시뮬레이션]
        
        user_id = api_handler.update_waste_log_and_get_user(policy=self.policies.get(result), type=result, weight=weight, reason=reason, city=self.city)
        final_status = api_handler.update_device_capacity(self.thresholds, result=result, level_pct=level_pct, user_id=user_id)
        if final_status == 'FULL':
            hardware_handler.rotate(result)
            return
        self.reset_ui("처리 완료!\n감사합니다.")

    def show_maintenance_mode_FULL(self):
        if self.main_label.cget("text") != MSG_FULL:
            self.main_label.config(text=MSG_FULL, image="")
            self.status_label.config(text="수거함이 가득 찼습니다. 잠시 후 이용해주세요.")
            self.is_processing = True

    def start_full_watcher(self):
        t = threading.Thread(target=self._full_status_monitor, daemon=True)
        t.start()

    def _full_status_monitor(self):
        while True:
            current_text = str(self.main_label.cget("text"))
            if self.is_processing and MSG_FULL in current_text:
                try:
                    dist = hardware_handler.request_levels()
                    is_cleared = api_handler.check_if_bins_emptied(self.thresholds, dist)
                    if is_cleared:
                        self.root.after(0, lambda: self.reset_ui("수거 완료! 다시 이용 가능합니다."))
                except Exception as e:
                    return
            time.sleep(60)

    def reset_ui(self, message):
        self.is_processing = True
        self.main_label.config(text=message, image="")
        self.status_label.config(text="")
        self.root.after(3000, self._enable_touch)

    def _enable_touch(self):
        api_handler.update_device_IDLE()
        self.main_label.config(text=MSG_IDLE)
        self.is_processing = False
        self.root.after(3000, lambda: self.main_label.event_generate("<Button-1>"))

if __name__ == "__main__":
    QRKioskApp()