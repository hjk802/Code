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

    import time

    def process_waste(self):
        self.main_label.config(text="처리 중입니다...", image="")
        self.status_label.config(text="잠시만 기다려주세요.")
        self.root.update_idletasks()
        
        # [하드웨어 작동 시뮬레이션]
        reason = None
        action_result = None  # 최종 수행할 동작 (reject, can, trans_pet, opa_pet)
        
        # 1단계: 사진 촬영 및 AI 분류 우선 진행 (품목을 알아야 무게 기준을 정함)
        image = capture_image()
        ai_result = classify(image)
        print("AI 분류 결과:", ai_result)
        
        # 2단계: 안정적인 무게 측정 (기존의 while 루프 버그 수정)
        weight = -1
        times = 10
        while weight < 0 and times > 0:
            weight = weight_handler.request_weight()
            times -= 1
            time.sleep(0.1)
            
        if weight < 0:
            weight = 1  # 센서 에러 시 기본값 대체
        
        # 3단계: 품목별 맞춤형 무게 검증 및 상태 분류
        # (1) AI 분류 결과 이물질이나 라벨 미제거인 경우 선제적 거절
        if ai_result["second_class"] != "normal":
            action_result = "reject"
            if ai_result["first_class"] == "exception":
                reason = "etc"
            elif ai_result["second_class"] == "label":
                reason = "label"
            else:
                reason = "pollution"
                
        # (2) 정상적인 품목인 경우 -> 캔과 플라스틱을 나누어 무게 검증
        else:
            # 플라스틱 페트병 분류 (투명/유색)
            if ai_result["first_class"] in ["clear_p", "color_p"]:
                # 플라스틱은 가벼우므로 내용물이 조금만 들어있어도(예: 30g 초과) 거절
                if weight > 30: 
                    action_result = "reject"
                    reason = "notempty"  # 플라스틱 내용물 미비움
                else:
                    action_result = "trans_pet" if ai_result["first_class"] == "clear_p" else "opa_pet"
                    
            # 캔 분류
            elif ai_result["first_class"] == "can":
                # 캔은 자체 무게가 있으므로 플라스틱보다 여유 있는 기준(예: 60g 초과) 적용
                if weight > 60:
                    action_result = "reject"
                    reason = "notempty"  # 캔 내용물 미비움
                else:
                    action_result = "can"
                    
            # 그 외 예외 상황
            else:
                action_result = "reject"
                reason = "etc"
    
        # 4단계: 최종 판정에 따른 하드웨어 제어
        if action_result == "reject":
            print(f"[반려] 사유: {reason}, 측정 무게: {weight}g")
            # 거절 시 UI 안내 및 투입구 개방 등의 하드웨어 제어를 여기에 추가하세요.
        else:
            print(f"[통과] 결과: {action_result}, 측정 무게: {weight}g")
            hardware_handler.rotate(action_result)
            time.sleep(3)
            hardware_handler.open_gate()
            level_pct = hardware_handler.request_levels()
            
        hardware_handler.home()
        # [하드웨어 작동 시뮬레이션 끝]

        
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
