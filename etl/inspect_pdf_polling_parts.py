import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

query = """
SELECT DISTINCT part_number, polling_station_name, polling_address, count(*)
FROM electors
WHERE polling_station_name ILIKE '%pdf%' 
   OR polling_station_name ILIKE '%ocred%'
   OR part_number IN ('140', '141', '112', '36', '37', '38', '39', '30', '31', '32', '33', '34', '35', '40')
GROUP BY part_number, polling_station_name, polling_address
ORDER BY part_number
"""

cur.execute(query)
rows = cur.fetchall()

print("====================================================")
print(f"POLLING STATIONS CURRENTLY ASSIGNED TO PDF OCR / PARTS:")
print("====================================================")
for r in rows:
    print(f"Part {r[0]:>3} | Voters: {r[3]:>5} | Station: '{r[1]}' | Addr: '{r[2]}'")

cur.close()
conn.close()
