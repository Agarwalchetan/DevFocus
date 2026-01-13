import requests

BASE_URL = "http://localhost:8001/api"

def debug_search():
    print("--- Debugging Search Endpoint ---")
    
    # Test 1: Single Char 'b'
    print("\n[1] Testing query 'b'...")
    try:
        res = requests.get(f"{BASE_URL}/users/search?q=b")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Response: {data}")
            if len(data) > 0:
                print("✅ Found results for 'b'")
            else:
                print("⚠️ No results for 'b' (Empty list)")
        else:
            print(f"❌ Error: {res.text}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

    # Test 2: Two Chars 'br'
    print("\n[2] Testing query 'br'...")
    try:
        res = requests.get(f"{BASE_URL}/users/search?q=br")
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print(f"Response: {res.json()}")
        else:
            print(f"❌ Error: {res.text}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    debug_search()
