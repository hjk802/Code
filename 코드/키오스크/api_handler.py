import requests
from config import *

def request_heartbeat(rssi_value):
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY, "Content-Type": "application/json"}
    try:
        url = f"{DEVICE_URL}?id=eq.{DEVICE_ID}"
        res = requests.patch(
            url, 
            headers=headers, 
            json={"last_sync": "now()", "net_rssi": rssi_value},
            timeout=5
        )
        return res.status_code in [200, 204]
    except:
        return False
    
def request_thresholds():
        headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY}
        try:
            url = f"{BASE_URL}/rest/v1/trash_level?order=distance_cm.desc"
            res = requests.get(url, headers=headers)
            return res.json()
        except:
            return []
    
def request_policies():
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY}
    try:
        url = f"{BASE_URL}/rest/v1/point_carbon_pergram"
        res = requests.get(url, headers=headers)
        policies = {item['type']: item for item in res.json()}
        return policies
    except:
        return {}

def get_token():
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY, "Content-Type": "application/json"}
    try:
        res = requests.post(TOKEN_URL, headers=headers, json={"id": DEVICE_ID, "password": DEVICE_PW}, timeout=5)
        return res.json().get("token") if res.status_code == 200 else None
    except:
        return None

def request_check_loop(is_processing):
    if not is_processing: return
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY}
    try:
        res = requests.get(f"{DEVICE_URL}?id=eq.{DEVICE_ID}&select=status", headers=headers)
        current_status = res.json()[0].get("status") if res.status_code == 200 else "IDLE"
    except:
        current_status = "ERROR"
    return current_status

def update_waste_log_and_get_user(policy, type, weight, reason=None, city=None):
    headers = {
        "Authorization": f"Bearer {ANON_KEY}", 
        "apikey": ANON_KEY, 
        "Content-Type": "application/json", 
        "Prefer": "return=representation"
    }
    point = 0
    carbon = 0
    if not policy:
        return
    try:
        res_log = requests.get(f"{BASE_URL}/rest/v1/waste_logs?device_id=eq.{DEVICE_ID}&order=created_at.desc&limit=1", headers=headers)
        log_data = res_log.json()
        if not log_data:
            return None
        log_num = log_data[0]['num']
        user_id = log_data[0].get('user_id')
        if type == "reject":
            point = policy.get('point_per_gram', -10)
            carbon = 0
        else:
            point = weight * policy.get('point', 0)
            carbon = weight * policy.get('carbon_gram', 0)

        update_data = {
            "trash_type": type,
            "trash_weight_gram": weight,
            "point_earned": point,
            "carbon_reduction_gram": carbon,
            "city": city,
            "rejection_reason": reason
        }
        patch_url = f"{BASE_URL}/rest/v1/waste_logs?num=eq.{log_num}"
        res_patch = requests.patch(patch_url, headers=headers, json=update_data)
        if res_patch.status_code in [200, 201, 204]:
            return user_id
        else:
            return None
    except Exception as e:
        return None
    
def request_city():
        headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY}
        try:
            url = f"{DEVICE_URL}?id=eq.{DEVICE_ID}&select=location,locations(city)"
            res = requests.get(url, headers=headers)
            data = res.json()[0]
            return data.get("locations", {}).get("city")
        except Exception as e:
            return None

def update_device_capacity(thresholds, result, level_pct, user_id=None):
    pct, status = calculate_status_by_dist(thresholds, level_pct)
    update_data = {}
    if result == "trans_pet":
        update_data["trans_level_pct"] = pct
    elif result == "opa_pet":
        update_data["opa_level_pct"] = pct
    elif result == "can":
        update_data["can_level_pct"] = pct
    elif result == "reject":
        update_data["reject_level_pct"] = pct
    else:
        raise ValueError(f"Unknown result: {result}")
    update_data["current_user_id"] = user_id
    update_data["status"] = status
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY, "Content-Type": "application/json"}
    requests.patch(f"{DEVICE_URL}?id=eq.{DEVICE_ID}", headers=headers, json=update_data)
    return status

def update_device_IDLE():
    update_data={}
    update_data["status"] = "IDLE"
    headers = {"Authorization": f"Bearer {ANON_KEY}", "apikey": ANON_KEY, "Content-Type": "application/json"}
    requests.patch(f"{DEVICE_URL}?id=eq.{DEVICE_ID}", headers=headers, json=update_data)

def calculate_status_by_dist(thresholds, current_dist):
    print(current_dist)
    max_dist = thresholds[0]['distance_cm']
    min_dist = thresholds[-1]['distance_cm']
    if current_dist >= max_dist:
        return 0, "IDLE"
    if current_dist <= min_dist:
        return 100, "FULL"
    total_range = max_dist - min_dist
    empty_dist = current_dist - min_dist
    detailed_pct = int(((total_range - empty_dist) / total_range) * 100)
    detailed_pct = max(0, min(100, detailed_pct))
    target_status = "IDLE"
    for th in thresholds:
        if current_dist <= th['distance_cm']:
            target_status = th['status']
        else:
            break
    print(detailed_pct)
    return detailed_pct, target_status

def check_if_bins_emptied(thresholds, d1):
    p1, s1 = calculate_status_by_dist(thresholds, d1)
    
    return all(s != 'FULL' for s in [s1])