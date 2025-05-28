#!/bin/bash

# Array of users with their credentials
declare -a users=(
    "john.smith:pass123"
    "emma.wilson:pass123"
    "carlos.garcia:pass123"
    "liu.yang:pass123"
    "sarah.connor:pass123"
    "mike.ross:pass123"
    "ana.silva:pass123"
    "raj.patel:pass123"
    "marie.dubois:pass123"
    "james.wilson:pass123"
)

# Function to login a user and save the token
login_user() {
    local credentials=$1
    local username=$(echo $credentials | cut -d: -f1)
    local password=$(echo $credentials | cut -d: -f2)
    
    echo "Logging in user: $username"
    
    response=$(curl -s -X POST http://localhost:3001/api/login \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}")
    
    # Check if login was successful
    if echo "$response" | grep -q "token"; then
        token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        echo "✅ Login successful for $username"
        echo "Token: $token"
    else
        echo "❌ Login failed for $username"
        echo "Response: $response"
    fi
    echo "----------------------------------------"
}

# Main script
echo "=== Starting login process for all users ==="
echo "Total users to process: ${#users[@]}"
echo "----------------------------------------"

# Process each user
for user in "${users[@]}"; do
    login_user "$user"
done

echo "=== Login process completed ===" 