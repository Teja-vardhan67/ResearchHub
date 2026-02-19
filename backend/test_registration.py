import urllib.request
import json
import random
import string

def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def test_registration():
    email = f"test_{get_random_string(5)}@example.com"
    password = "password123"
    
    url = "http://127.0.0.1:8000/auth/register"
    data = {
        "email": email,
        "password": password
    }
    
    # Convert data to JSON and bytes
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'})
    
    print(f"Attempting to register user: {email}")
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            response_body = response.read().decode('utf-8')
            
            print(f"Status Code: {status_code}")
            print(f"Response Body: {response_body}")
            
            if status_code == 200:
                print("✅ Registration successful!")
            else:
                print("❌ Registration failed.")
                
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except urllib.error.URLError as e:
        print(f"❌ Connection Error: {e.reason}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_registration()
