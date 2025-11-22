# Admin Setup and Login Guide

## Step-by-Step Guide to Create Admin and Login

### Method 1: Create Super Admin via API Endpoint (Recommended)

#### Step 1: Configure Environment Variables

1. Open the `.env` file in the backend directory:
   ```bash
   cd "/home/nomi/Desktop/MindMate (1)/MindMate/backend"
   nano .env
   ```

2. Add the following environment variables (if not already present):
   ```env
   # Super Admin Configuration
   SUPER_ADMIN_EMAIL=admin@mindmate.com
   SUPER_ADMIN_PASSWORD=Admin123!@#
   SUPER_ADMIN_FIRST_NAME=Admin
   SUPER_ADMIN_LAST_NAME=User
   ADMIN_REGISTRATION_KEY=your-secret-admin-key-12345
   ```

   **Important Notes:**
   - `SUPER_ADMIN_EMAIL`: Your admin email address
   - `SUPER_ADMIN_PASSWORD`: Must be at least 8 characters with uppercase, lowercase, and number
   - `SUPER_ADMIN_FIRST_NAME`: Admin's first name
   - `SUPER_ADMIN_LAST_NAME`: Admin's last name
   - `ADMIN_REGISTRATION_KEY`: A secret key (at least 10 characters) - **Remember this!** You'll need it for login

3. Save the file (Ctrl+X, then Y, then Enter in nano)

#### Step 2: Start the Backend Server

```bash
cd "/home/nomi/Desktop/MindMate (1)/MindMate/backend"
source venv/bin/activate
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Step 3: Create the Super Admin

Open a new terminal and run:

```bash
curl -X POST http://localhost:8000/api/admin/create-super-admin
```

Or use a tool like Postman/Thunder Client:
- **Method:** POST
- **URL:** `http://localhost:8000/api/admin/create-super-admin`
- **No authentication required**

**Expected Response:**
```json
{
  "message": "Super admin created successfully",
  "email": "admin@mindmate.com",
  "name": "Admin User",
  "role": "super_admin",
  "status": "created"
}
```

If admin already exists:
```json
{
  "message": "Super admin already exists",
  "email": "admin@mindmate.com",
  "status": "skipped"
}
```

---

### Method 2: Login as Admin

#### Step 1: Prepare Login Request

You need the following information:
- **Email:** The email you set in `SUPER_ADMIN_EMAIL`
- **Password:** The password you set in `SUPER_ADMIN_PASSWORD`
- **Secret Key:** The value you set in `ADMIN_REGISTRATION_KEY`
- **User Type:** `"admin"`

#### Step 2: Send Login Request

**Using cURL:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mindmate.com",
    "password": "Admin123!@#",
    "user_type": "admin",
    "secret_key": "your-secret-admin-key-12345"
  }'
```

**Using Postman/Thunder Client:**
- **Method:** POST
- **URL:** `http://localhost:8000/api/auth/login`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "email": "admin@mindmate.com",
    "password": "Admin123!@#",
    "user_type": "admin",
    "secret_key": "your-secret-admin-key-12345",
    "remember_me": false
  }
  ```

#### Step 3: Save the Access Token

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "...",
    "email": "admin@mindmate.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "super_admin",
    "status": "active"
  },
  "user_type": "admin"
}
```

**Save the `access_token`** - you'll need it for authenticated admin requests!

---

### Step 4: Use Admin Token for Authenticated Requests

For any admin API endpoint, include the token in the Authorization header:

```bash
curl -X GET http://localhost:8000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**In Postman/Thunder Client:**
- Add header:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

---

## Quick Reference

### Environment Variables Needed:
```env
SUPER_ADMIN_EMAIL=admin@mindmate.com
SUPER_ADMIN_PASSWORD=Admin123!@#
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
ADMIN_REGISTRATION_KEY=your-secret-admin-key-12345
```

### API Endpoints:

1. **Create Super Admin:**
   - `POST /api/admin/create-super-admin`
   - No auth required

2. **Admin Login:**
   - `POST /api/auth/login`
   - Body: `{"email": "...", "password": "...", "user_type": "admin", "secret_key": "..."}`

3. **Admin Dashboard (Example):**
   - `GET /api/admin/dashboard`
   - Requires: `Authorization: Bearer <token>`

---

## Troubleshooting

### Error: "Super admin credentials not configured"
- **Solution:** Make sure all 5 environment variables are set in `.env` file

### Error: "Secret key is required for admin login"
- **Solution:** Include `"secret_key"` field in login request body

### Error: "Invalid credentials"
- **Solution:** 
  - Check email and password match `.env` values
  - Check `secret_key` matches `ADMIN_REGISTRATION_KEY` in `.env`
  - Make sure `user_type` is exactly `"admin"` (lowercase)

### Error: "Admin already exists"
- **Solution:** This is normal if admin was already created. You can proceed to login.

---

## Security Notes

⚠️ **Important Security Reminders:**
1. Never commit `.env` file to version control
2. Use strong passwords (min 8 chars, uppercase, lowercase, number)
3. Keep `ADMIN_REGISTRATION_KEY` secret and secure
4. Change default credentials in production
5. The `secret_key` in login must match `ADMIN_REGISTRATION_KEY` from environment

---

## Example Complete Workflow

```bash
# 1. Set environment variables (in .env file)
SUPER_ADMIN_EMAIL=admin@mindmate.com
SUPER_ADMIN_PASSWORD=SecurePass123!
SUPER_ADMIN_FIRST_NAME=Admin
SUPER_ADMIN_LAST_NAME=User
ADMIN_REGISTRATION_KEY=my-secret-key-2024

# 2. Create admin
curl -X POST http://localhost:8000/api/admin/create-super-admin

# 3. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mindmate.com",
    "password": "SecurePass123!",
    "user_type": "admin",
    "secret_key": "my-secret-key-2024"
  }'

# 4. Use token for admin operations
curl -X GET http://localhost:8000/api/admin/dashboard \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```

