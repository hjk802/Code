import time
import RPi.GPIO as GPIO

DT_PIN = 2
SCK_PIN = 3

calibration_factor = -45

GPIO.setmode(GPIO.BCM)
GPIO.setup(SCK_PIN, GPIO.OUT)
GPIO.setup(DT_PIN, GPIO.IN)

def read_hx711_raw():
    """HX711 보드로부터 24비트 원시 디지털 데이터를 직접 읽어오는 함수"""
    GPIO.output(SCK_PIN, False)
    
    timeout = 0
    while GPIO.input(DT_PIN) == 1:
        time.sleep(0.001)
        timeout += 1
        if timeout > 200: 
            return None

    count = 0
    for _ in range(24):
        GPIO.output(SCK_PIN, True)
        count = count << 1
        GPIO.output(SCK_PIN, False)
        if GPIO.input(DT_PIN):
            count += 1

    GPIO.output(SCK_PIN, True)
    GPIO.output(SCK_PIN, False)

    if count & 0x800000:
        count -= 0x1000000

    return count

def get_average_raw(times=5):
    """안정적인 측정을 위해 지정한 횟수만큼 읽어 평균을 내는 함수"""
    total = 0
    success = 0
    for _ in range(times):
        val = read_hx711_raw()
        if val is not None:
            total += val
            success += 1
        time.sleep(0.01)
    return total / success if success > 0 else None

time.sleep(3)
OFFSET = get_average_raw(15)


def request_weight():
    raw = get_average_raw(5)

    if raw is None:
        return 0

    weight = (raw - OFFSET) / calibration_factor

    return round(weight, 1)

# 기존 맨 아래의 while(): 부분을 아래와 같이 수정하세요.
""""""
if __name__ == "__main__":
    try:
        print("영점(Offset) 설정 완료. 무게 측정을 시작합니다...")
        while True:
            weight = request_weight()
            print(f"현재 측정된 무게: {weight} g")
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n측정을 종료합니다.")
    finally:
        # 첫 번째 질문에서 다루었던 GPIO 핀 정리(Cleanup)를 수행합니다.
        GPIO.cleanup()
