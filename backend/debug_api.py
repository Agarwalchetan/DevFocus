import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def debug_api():
    # 1. Login
    login_payload = {"username": "test@example.com", "password": "password123"}
    # Note: Using x-www-form-urlencoded typically for OAuth2 but app might use JSON?
    # Checking auth.py or assumption. Let's try JSON first or form.
    # Actually standard FastAPI OAuth2 is form data.
    
    # Try creating user first just in case
    try:
        requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Test", "email": "debug_api_user@test.com", "password": "password123"})
    except: pass

    # Login
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "debug_api_user@test.com", "password": "password123"})
    if not resp.ok:
        print(f"Login Failed: {resp.text}")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    # 2. Create Room
    room_payload = {"name": "Debug Room", "password": "pass", "isPrivate": True}
    resp = requests.post(f"{BASE_URL}/api/rooms", json=room_payload, headers=headers)
    if not resp.ok:
        print(f"Create Room Failed: {resp.text}")
        return
    
    room_id = resp.json()["roomId"]
    print(f"Created Room: {room_id}")

    # 3. Get Room Details
    print(f"Fetching details for {room_id}...")
    resp = requests.get(f"{BASE_URL}/api/rooms/{room_id}", headers=headers)
    
    if not resp.ok:
        print(f"Get Details Failed: {resp.text}")
        return

    data = resp.json()
    print("\n--- JSON RESPONSE ---")
    print(json.dumps(data, indent=2))
    print("---------------------\n")
    
    if "blockedUsers" in data:
        print(f"SUCCESS: blockedUsers found: {data['blockedUsers']}")
    else:
        print("FAILURE: blockedUsers KEY MISSING from response!")

if __name__ == "__main__":
    try:
        debug_api()
    except Exception as e:
        print(f"Script Error: {e}")
