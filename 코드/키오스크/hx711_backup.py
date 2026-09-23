import machine
import time

class HX711:
    def __init__(self, d_out, pd_sck):
        self.d_out = d_out
        self.pd_sck = pd_sck
        self.offset = 0
        self.scale = 1

    def read(self):
        # 1. 데이터 준비 대기
        while self.d_out.value() == 1:
            pass
        
        raw_data = 0
        
        # 2. 24비트 데이터 수신 (피코 초고속 클럭 대응 타이밍 교정)
        for _ in range(24):
            self.pd_sck.high()
            time.sleep_us(5)  # 펄스 폭 안정화를 위해 5마이크로초 대기
            
            raw_data = (raw_data << 1) | self.d_out.value()
            
            self.pd_sck.low()
            time.sleep_us(5)  # 하강 모서리 안정화 대기
            
        # 3. 25번째 클럭 제공 (채널 A, 이득 128 설정 및 다음 통신 준비)
        self.pd_sck.high()
        time.sleep_us(5)
        self.pd_sck.low()
        time.sleep_us(5)
        
        # 4. 음수 부호 비트 처리
        if raw_data & 0x800000:
            raw_data -= 0x1000000
            
        return raw_data

    def tare(self):
        sum_data = 0
        for _ in range(20):
            sum_data += self.read()
            time.sleep_ms(10)
        self.offset = sum_data / 20

    def set_scale(self, scale):
        self.scale = scale

    def get_units(self, times=1):
        sum_data = 0
        for _ in range(times):
            sum_data += self.read()
        return (sum_data / times - self.offset) / self.scale

