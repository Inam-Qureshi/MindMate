import requests
import json
import random
import string
import time

BASE_URL = "http://localhost:8000/api"
# Note: The router prefix in main.py is /api, and verification router has prefix /verification
# So full path is /api/verification/...
# But wait, main.py includes api_router with prefix "/api".
# api_router (v1/router.py) includes verification.router.
# verification.router has prefix "/verification".
# So it should be /api/verification/...
# Let's check if v1/router.py has a prefix.
# v1/router.py: router = APIRouter() ... router.include_router(verification.router, ...)
# So it's /api/verification/...

# Actually, let's double check the paths.
# main.py: app.include_router(api_router, prefix="/api")
# v1/router.py: router.include_router(verification.router, ...)
# verification.py: router = APIRouter(prefix="/verification", ...)
# So URL is /api/verification/register/patient, /api/verification/verify-email, etc.

BASE_URL = "http://localhost:8000/api/verification"

def generate_random_email():
    return f"test_{''.join(random.choices(string.ascii_lowercase, k=8))}@example.com"

def register_patient(email):
    print(f"Registering patient with email: {email}")
    url = f"{BASE_URL}/register/patient"
    data = {
        "first_name": "Test",
        "last_name": "User",
        "email": email,
        "password": "Password123!",
        "gender": "male",
        "accepts_terms_and_conditions": True
    }
    try:
        response = requests.post(url, json=data)
        print(f"Registration Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Registration Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Registration failed with exception: {e}")
        return False

def resend_otp(email):
    print(f"\nResending OTP for: {email}")
    url = f"{BASE_URL}/resend-otp"
    data = {"email": email}
    try:
        response = requests.post(url, json=data)
        print(f"Resend OTP Status: {response.status_code}")
        print(f"Resend OTP Response: {response.text}")
    except Exception as e:
        print(f"Resend OTP failed with exception: {e}")

def verify_email(email, otp="123456"):
    print(f"\nVerifying email for: {email} with OTP: {otp}")
    url = f"{BASE_URL}/verify-email"
    data = {
        "email": email,
        "otp": otp,
        "usertype": "patient"
    }
    try:
        response = requests.post(url, json=data)
        print(f"Verification Status: {response.status_code}")
        print(f"Verification Response: {response.text}")
    except Exception as e:
        print(f"Verification failed with exception: {e}")


def test_specialist_flow():
    print("\n--- Testing Specialist Flow ---")
    email = f"test_specialist_{int(time.time())}@example.com"
    password = "Password123!"
    
    # 1. Register
    print(f"Registering specialist: {email}")
    response = requests.post(f"{BASE_URL}/specialists/registration/register", json={
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "Specialist",
        "specialist_type": "psychologist",
        "license_number": "LIC-12345",
        "city": "Lahore",
        "accepts_terms_and_conditions": True,
        "years_experience": 5
    })
    print(f"Registration status: {response.status_code}")
    if response.status_code != 201:
        print(f"Registration failed: {response.text}")
        return

    # 2. Resend OTP
    print("Resending OTP...")
    response = requests.post(f"{BASE_URL}/verification/resend-otp", json={
        "email": email,
        "user_type": "specialist"
    })
    print(f"Resend OTP status: {response.status_code}")
    print(f"Resend OTP response: {response.text}")

    # 3. Verify Email (with dummy OTP to check for 500)
    print("Verifying email with dummy OTP...")
    response = requests.post(f"{BASE_URL}/verification/verify-email", json={
        "email": email,
        "otp": "000000",
        "usertype": "specialist"
    })
    print(f"Verification status: {response.status_code}")
    print(f"Verification response: {response.text}")

def test_patient_flow():
    print("\n--- Testing Patient Flow ---")
    email = generate_random_email()
    if register_patient(email):
        # Try to resend OTP
        resend_otp(email)
        
        # Try to verify with dummy OTP (should fail with 400 or 500 if broken)
        verify_email(email, "000000")

if __name__ == "__main__":
    test_patient_flow()
    test_specialist_flow()
