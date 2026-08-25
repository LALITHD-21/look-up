import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("====================================================")
print("  RAPID DATABASE & EPIC RECORD INTEGRITY AUDIT")
print("====================================================")

# 1. Total Count Audit
cur.execute("SELECT count(*) FROM electors")
total_count = cur.fetchone()[0]
print(f"Total Database Electors Count: {total_count:,}")

# 2. Check for Invalid / Header text rows
cur.execute("""
    SELECT count(*) FROM electors 
    WHERE name ILIKE '%elector%' 
       OR name ILIKE '%sl no%' 
       OR name ILIKE '%assembly constituency%'
       OR name ILIKE '%table of content%'
       OR sex NOT IN ('M', 'F')
""")
invalid_count = cur.fetchone()[0]
print(f"Header/Invalid Text Rows Count: {invalid_count} (Target: 0)")

# 3. Check for Age Range Violations
cur.execute("SELECT count(*) FROM electors WHERE age < 18 OR age > 120")
invalid_age_count = cur.fetchone()[0]
print(f"Out-of-range Age Count:        {invalid_age_count} (Target: 0)")

# 4. Check Null EPIC Numbers
cur.execute("SELECT count(*) FROM electors WHERE epic_number IS NULL OR epic_number = ''")
null_epic_count = cur.fetchone()[0]
print(f"Null / Empty EPIC Count:       {null_epic_count} (Target: 0)")

# 5. Check Duplicate EPIC Keys in DB
cur.execute("""
    SELECT epic_number, count(*) 
    FROM electors 
    GROUP BY epic_number 
    HAVING count(*) > 1
""")
duplicate_epics = cur.fetchall()
print(f"Duplicate EPIC Keys in DB:     {len(duplicate_epics)} (Target: 0)")

# 6. Sample 10 Random EPIC Lookups & Display Complete Details
print("\n----------------------------------------------------")
print("RAPID RANDOM EPIC LOOKUP INTEGRITY TEST (10 SAMPLES)")
print("----------------------------------------------------")

cur.execute("SELECT id FROM electors ORDER BY RANDOM() LIMIT 10")
sample_ids = [r[0] for r in cur.fetchall()]

passed_samples = 0
for i, sid in enumerate(sample_ids, 1):
    cur.execute("""
        SELECT serial_number, epic_number, name, relative_name, address, 
               qualification, occupation, age, sex, part_number, polling_station_name
        FROM electors
        WHERE id = %s
    """, (sid,))
    row = cur.fetchone()
    
    serial, epic, name, rel_name, address, qual, occ, age, sex, part_num, polling_station = row
    
    # Assertions
    is_valid = (
        name is not None and len(name) > 0 and
        epic is not None and len(epic) > 0 and
        sex in ('M', 'F') and
        18 <= age <= 120
    )
    
    if is_valid:
        passed_samples += 1
        status = "[PASSED]"
    else:
        status = "[FAILED]"
        
    print(f"\nSample #{i} {status}:")
    print(f"  • EPIC Number:          {epic}")
    print(f"  • Serial Number:        {serial}")
    print(f"  • Elector Name:         {name}")
    print(f"  • Relative Name:        {rel_name or 'N/A'}")
    print(f"  • Address:              {address or 'N/A'}")
    print(f"  • Qualification:        {qual or 'N/A'}")
    print(f"  • Occupation:           {occ or 'N/A'}")
    print(f"  • Age / Sex:            {age} / {sex}")
    print(f"  • Part No / Station:    Part {part_num} - {polling_station or 'N/A'}")

print("\n====================================================")
print(f"AUDIT SUMMARY: {passed_samples}/10 Random Samples Passed Match Test.")
print("====================================================")

cur.close()
conn.close()
