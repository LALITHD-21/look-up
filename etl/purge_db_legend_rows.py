import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Find all remaining legend / metadata rows
query = """
SELECT count(*) FROM electors
WHERE name ILIKE '%M-Male%'
   OR name ILIKE '%F-Female%'
   OR name ILIKE '%Sex:%'
   OR name ILIKE '%Identity%'
   OR relative_name ILIKE '%Identity%'
   OR address ILIKE '%Card%'
   OR name ILIKE '%Elector Name%'
   OR relative_name ILIKE '%Father/Mother/Husband%'
   OR address ILIKE '%Ordinary Residence%'
   OR qualification ILIKE '%Qualification%'
   OR occupation ILIKE '%Occupcation%'
"""

cur.execute(query)
legend_count = cur.fetchone()[0]

print("====================================================")
print(f"Legend / Meta Rows Identified for Purge: {legend_count}")
print("====================================================")

# Execute purge
delete_query = """
DELETE FROM electors
WHERE name ILIKE '%M-Male%'
   OR name ILIKE '%F-Female%'
   OR name ILIKE '%Sex:%'
   OR name ILIKE '%Identity%'
   OR relative_name ILIKE '%Identity%'
   OR address ILIKE '%Card%'
   OR name ILIKE '%Elector Name%'
   OR relative_name ILIKE '%Father/Mother/Husband%'
   OR address ILIKE '%Ordinary Residence%'
   OR qualification ILIKE '%Qualification%'
   OR occupation ILIKE '%Occupcation%'
"""

cur.execute(delete_query)
conn.commit()

cur.execute("SELECT count(*) FROM electors")
final_count = cur.fetchone()[0]

print(f"Pristine Database Total Electors Count: {final_count:,}")
print("====================================================")

cur.close()
conn.close()
