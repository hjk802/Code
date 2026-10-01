import machine
import time
import random
import utime
import sys

from hx711 import HX711

servo0 = machine.PWM(machine.Pin(0))
servo0.freq(50)
servo1 = machine.PWM(machine.Pin(1))
servo1.freq(50)

detect_trig = machine.Pin(12, machine.Pin.OUT)
detect_echo = machine.Pin(13, machine.Pin.IN)
level_trig = machine.Pin(16, machine.Pin.OUT)
level_echo = machine.Pin(17, machine.Pin.IN)

sck_pin = machine.Pin(14, machine.Pin.OUT)
dt_pin = machine.Pin(15, machine.Pin.IN)

en_pin = machine.Pin(3, machine.Pin.OUT)
step_pin = machine.Pin(18, machine.Pin.OUT)
dir_pin = machine.Pin(19, machine.Pin.OUT)
endstop_pin = machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP)

hx = HX711(d_out=dt_pin, pd_sck=sck_pin)
time.sleep(1)
hx.tare()
hx.set_scale(420)

def get_distance(trig, echo):
    trig.low()
    time.sleep_us(2)
    trig.high()
    time.sleep_us(10)
    trig.low()
    while echo.value() == 0:
        signaloff = time.ticks_us()
    while echo.value() == 1:
        signalon = time.ticks_us()
    timepassed = signalon - signaloff
    distance_cm = (timepassed * 0.0343) / 2
    return distance_cm

def set_angle(servo, angle):
    duty = int(1638 + (angle / 180) * (8191 - 1638))
    servo.duty_u16(duty)

set_angle(servo0, 90)
set_angle(servo1, 90)



def detect_object(timeout=30):
    start = time.ticks_ms()
    while True:
        distance = get_distance(detect_trig, detect_echo)
        if distance <= 25:
            return True
        if time.ticks_diff(time.ticks_ms(), start) >= timeout * 1000:
            return False
        time.sleep_ms(100)

def get_weight():
    weight = hx.get_units(15)
    if -3.0 < weight < 3.0:
        weight = 101.0
    return round(weight, 1)

def open_gate():
    for i in range(91):
        set_angle(servo0, 90 - i)
        set_angle(servo1, 90 + i)
        time.sleep_ms(10)
    time.sleep(2)
    for i in range(91):
        set_angle(servo0, i)
        set_angle(servo1, 180 - i)
        time.sleep_ms(10)

def get_level():
    return get_distance(level_trig, level_echo)

def step(delay_us=2000):
    step_pin.value(1)
    utime.sleep_us(delay_us)
    step_pin.value(0)
    utime.sleep_us(delay_us)

def rotate_steps(steps):
    en_pin.value(0)      # Enable
    dir_pin.value(0)     # 회전 방향 (필요하면 1로 변경)
    for _ in range(steps):
        step()
    en_pin.value(1)

def rotate_step(result):
    if result == "can":
        #print("0도")
        rotate_steps(50)

    elif result == "opa":
        #print("90도")
        rotate_steps(350)

    elif result == "trans":
        #print("180도")
        rotate_steps(700)

    else:
        #print("270도")
        rotate_steps(1200)

def home():
    en_pin.value(0)
    utime.sleep_ms(10)
    dir_pin.value(1)
    while endstop_pin.value() == 1:
        step(500)

    utime.sleep_ms(20)
    dir_pin.value(0)
    while endstop_pin.value() == 0:
        step(1000)

    for _ in range(20):
        step(1000)
    utime.sleep_ms(20)
    dir_pin.value(1)
    while endstop_pin.value() == 1:
        step(2000)

    utime.sleep_ms(20)
    # 필요하면 현재 위치를 0으로 저장
    # current_position = 0
    en_pin.value(1)
    step_pin.value(0)
    dir_pin.value(0)



while True:
    command = sys.stdin.readline().strip()

    if command == "":
        continue

    if command == "DETECT":
        result = detect_object()
        if result:
            print("OK")
        else:
            print("TIMEOUT")

    elif command == "WEIGHT":
        print(get_weight())

    elif command.startswith("ROTATE:"):
        result = command.split(":")[1]
        rotate_step(result)
        print("OK")

    elif command == "OPEN":
        open_gate()
        print("OK")

    elif command == "LEVEL":
        print(get_level())

    elif command == "HOME":
        home()
        print("OK")
