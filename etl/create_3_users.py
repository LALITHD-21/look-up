import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase: Client = create_client(url, key)

accounts = [
    {"email": "admin@electorportal.com", "password": "AdminPassword123!", "role": "System Admin"},
    {"email": "operator@electorportal.com", "password": "OperatorPassword123!", "role": "Data Operator"},
    {"email": "supervisor@electorportal.com", "password": "SupervisorPassword123!", "role": "Electoral Supervisor"},
]

print("Provisioning 3 user accounts in Supabase Auth...")

existing_users = []
try:
    res = supabase.auth.admin.list_users()
    if hasattr(res, 'users'):
        existing_users = res.users
    elif isinstance(res, list):
        existing_users = res
except Exception as e:
    print(f"List users notice: {e}")

for acc in accounts:
    email = acc["email"]
    pwd = acc["password"]
    role = acc["role"]
    
    existing_user = None
    for u in existing_users:
        u_email = getattr(u, 'email', '')
        if u_email and u_email.lower() == email.lower():
            existing_user = u
            break

    if existing_user:
        try:
            supabase.auth.admin.update_user_by_id(existing_user.id, {
                "password": pwd,
                "email_confirm": True,
                "user_metadata": {"role": role}
            })
            print(f"✓ UPDATED: {email} ({role})")
        except Exception as update_err:
            print(f"Error updating {email}: {update_err}")
    else:
        try:
            supabase.auth.admin.create_user({
                "email": email,
                "password": pwd,
                "email_confirm": True,
                "user_metadata": {"role": role}
            })
            print(f"✓ CREATED: {email} ({role})")
        except Exception as create_err:
            print(f"Error creating {email}: {create_err}")

print("PROVISIONING COMPLETE SUCCESS")
