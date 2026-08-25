import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

delete_query = """
DELETE FROM electors
WHERE qualification ILIKE 'Part No%'
   OR occupation ILIKE 'Part No%'
   OR address ILIKE 'Part No%'
   OR (name ILIKE 'Voter NOP%' AND relative_name IS NULL AND address IS NULL)
   OR (name ILIKE 'Elector #%' AND relative_name IS NULL AND address IS NULL)
"""

cur.execute(delete_query)
deleted_cnt = cur.rowcount
conn.commit()

cur.execute("SELECT count(*) FROM electors")
final_cnt = cur.fetchone()[0]

print("====================================================")
print(f"Purged Header Artifact Rows:   {deleted_cnt}")
print(f"Pristine Database Total Count: {final_cnt:,}")
print("====================================================")

cur.close()
conn.close()
