import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("====================================================")
print("  EXECUTING HEADER / META ROW PURGE ON SUPABASE DB")
print("====================================================")

cur.execute("SELECT count(*) FROM electors")
initial_count = cur.fetchone()[0]
print(f"Initial Database Record Count: {initial_count:,}")

# Execute deletion of table header label rows
delete_query = """
DELETE FROM electors
WHERE relative_name ILIKE '%father%'
   OR relative_name ILIKE '%husband%'
   OR relative_name ILIKE '%mother%'
   OR address ILIKE '%ordinary residence%'
   OR qualification ILIKE '%qualification%'
   OR occupation ILIKE '%occupcation%'
   OR occupation ILIKE '%occupation%'
"""

cur.execute(delete_query)
deleted_count = cur.rowcount
conn.commit()

cur.execute("SELECT count(*) FROM electors")
final_count = cur.fetchone()[0]

print(f"Purged Non-Voter Header Rows:  {deleted_count:,}")
print(f"Pristine Database Total Count: {final_count:,}")
print("====================================================")

cur.close()
conn.close()
