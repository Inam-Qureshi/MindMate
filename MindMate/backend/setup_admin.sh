#!/bin/bash

# Admin Setup Script for MindMate
# This script helps you set up admin environment variables and create the admin

echo "=========================================="
echo "MindMate Admin Setup Script"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file first or copy from .env.example"
    exit 1
fi

echo "Step 1: Setting up environment variables"
echo "------------------------------------------"
echo ""

# Prompt for admin details
read -p "Enter admin email: " ADMIN_EMAIL
read -p "Enter admin password (min 8 chars, must have uppercase, lowercase, number): " ADMIN_PASSWORD
read -p "Enter admin first name: " ADMIN_FIRST_NAME
read -p "Enter admin last name: " ADMIN_LAST_NAME
read -p "Enter admin registration key (secret key for login, min 10 chars): " ADMIN_KEY

echo ""
echo "Step 2: Adding to .env file"
echo "------------------------------------------"

# Check if variables already exist
if grep -q "SUPER_ADMIN_EMAIL" .env; then
    echo "⚠️  Admin variables already exist in .env"
    read -p "Do you want to update them? (y/n): " UPDATE
    if [ "$UPDATE" = "y" ] || [ "$UPDATE" = "Y" ]; then
        # Remove old values
        sed -i '/^SUPER_ADMIN_EMAIL=/d' .env
        sed -i '/^SUPER_ADMIN_PASSWORD=/d' .env
        sed -i '/^SUPER_ADMIN_FIRST_NAME=/d' .env
        sed -i '/^SUPER_ADMIN_LAST_NAME=/d' .env
        sed -i '/^ADMIN_REGISTRATION_KEY=/d' .env
    else
        echo "Skipping .env update"
    fi
fi

# Add new values
echo "" >> .env
echo "# Super Admin Configuration" >> .env
echo "SUPER_ADMIN_EMAIL=$ADMIN_EMAIL" >> .env
echo "SUPER_ADMIN_PASSWORD=$ADMIN_PASSWORD" >> .env
echo "SUPER_ADMIN_FIRST_NAME=$ADMIN_FIRST_NAME" >> .env
echo "SUPER_ADMIN_LAST_NAME=$ADMIN_LAST_NAME" >> .env
echo "ADMIN_REGISTRATION_KEY=$ADMIN_KEY" >> .env

echo "✅ Environment variables added to .env"
echo ""

echo "Step 3: Creating super admin via API"
echo "------------------------------------------"

# Check if server is running
if ! curl -s http://localhost:8000/api/admin/health > /dev/null 2>&1; then
    echo "⚠️  Backend server doesn't seem to be running on http://localhost:8000"
    echo "Please start the server first:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    echo ""
    read -p "Press Enter when server is running, or Ctrl+C to exit..."
fi

# Create admin
echo "Creating super admin..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/admin/create-super-admin)

if echo "$RESPONSE" | grep -q "created successfully"; then
    echo "✅ Super admin created successfully!"
elif echo "$RESPONSE" | grep -q "already exists"; then
    echo "ℹ️  Super admin already exists"
else
    echo "❌ Error creating admin:"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your admin credentials:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "  Secret Key: $ADMIN_KEY"
echo ""
echo "To login, use:"
echo "  POST http://localhost:8000/api/auth/login"
echo "  Body: {"
echo "    \"email\": \"$ADMIN_EMAIL\","
echo "    \"password\": \"$ADMIN_PASSWORD\","
echo "    \"user_type\": \"admin\","
echo "    \"secret_key\": \"$ADMIN_KEY\""
echo "  }"
echo ""
echo "See ADMIN_SETUP_GUIDE.md for detailed instructions"
echo ""

