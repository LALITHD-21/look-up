import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

supabase: Client = create_client(url, key)

try:
    users = supabase.auth.admin.list_users()
    print(f"Total users found: {len(users)}")
    for u in users:
        print(f"- Email: {u.email} | Confirmed: {u.email_confirmed_at is not None} | Last Sign In: {u.last_sign_in_at}")
except Exception as e:
    print(f"Error listing users: {e}")
