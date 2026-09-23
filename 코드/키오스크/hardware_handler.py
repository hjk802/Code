import serial
import random

ser = serial.Serial(
    "/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_e6657cd4235c9332-if00",
    115200,
    timeout=10
)

def send(cmd):

    ser.write((cmd + "\n").encode())

    buffer = ""

    while True:
        data = ser.read(1).decode(errors="ignore")

        if data:
            buffer += data

            if data == "\n":
                break

    return buffer.strip()

def request_insert():
    return send("DETECT")

def request_result():
    a = "reject"
    b = "opa_pet"
    c = "trans_pet"
    d = "can"
    return random.choice([a, b, c, d])

def request_rejection_reason():
    rejection_reason = ["label", "notempty", "pollution", "etc"]
    return random.choice(rejection_reason)

def request_weight():
    return float(send("WEIGHT"))

def rotate(result):
    send(f"ROTATE:{result}")

def open_gate():
    send("OPEN")

def home():
    send("HOME")

def request_levels():
    res = send("LEVEL")
    try:
        # 보드에서 "75" 같은 숫자가 온다면 정수(int)로 변환하여 반환
        return int(float(res))
    except ValueError:
        # 통신 오류 등으로 숫자가 아닐 경우 안전하게 기본값(예: 0) 반환
        print(f"[경고] LEVEL 수신 데이터 오류: '{res}'")
        return 0 