import os

os.environ["TK_SILENCE_DEPRECATION"] = "1"

BASE_URL = "https://kaclwnxcgiodwdrregwd.supabase.co"
TOKEN_URL = f"{BASE_URL}/functions/v1/respon_token"
DEVICE_URL = f"{BASE_URL}/rest/v1/devices"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY2x3bnhjZ2lvZHdkcnJlZ3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NTI1NzAsImV4cCI6MjA5MDQyODU3MH0.OGKnl8y5T_0aOtrKwDYeMKa_WzD3qTXKB42Dy24rgfA"
DEVICE_ID = "test"
DEVICE_PW = "q1w2"

MSG_IDLE = "잠시만 기다려주세요."
MSG_TIMEOUT = "시간이 초과되었습니다."
MSG_MAINTENANCE = "시스템 점검 중"
MSG_INPUT_WAIT = "투입 대기 중... "
MSG_FULL = "시스템 점검 중(가득 참)"