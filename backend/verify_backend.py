import httpx
import time
import sys

def verify():
    print("Waiting for server...", flush=True)
    time.sleep(5)
    base_url = "http://localhost:8000"
    
    try:
        # Health Check
        print("Checking Health...", flush=True)
        try:
            res = httpx.get(f"{base_url}/health", timeout=5.0)
            if res.status_code == 200:
                print("✅ Health Check Passed", flush=True)
            else:
                print(f"❌ Health Check Failed: {res.status_code}", flush=True)
        except Exception as e:
            print(f"❌ Health Check Connection Failed: {e}", flush=True)

        # Auth Register
        print("Checking Registration...", flush=True)
        try:
            res = httpx.post(f"{base_url}/auth/register", json={"email": "verify2@example.com", "password": "password123"}, timeout=5.0)
            if res.status_code in [200, 400]:
                print("✅ Auth Register Reachable", flush=True)
            else:
                print(f"❌ Auth Register Failed: {res.status_code} {res.text}", flush=True)
        except Exception as e:
             print(f"❌ Auth Check Connection Failed: {e}", flush=True)
            
        # Search
        print("Checking arXiv Search...", flush=True)
        try:
            res = httpx.get(f"{base_url}/research/search?query=llama", timeout=10.0)
            if res.status_code == 200:
                items = res.json()
                if isinstance(items, list):
                    print(f"✅ Search Returned {len(items)} results", flush=True)
                else:
                     print("❌ Search returned invalid format", flush=True)
            else:
                 print(f"❌ Search Failed: {res.status_code} {res.text}", flush=True)
        except Exception as e:
             print(f"❌ Search Check Connection Failed: {e}", flush=True)

    except Exception as e:
        print(f"❌ Verification Failed: {e}", flush=True)

if __name__ == "__main__":
    verify()
