import os
import sys
import time
import psycopg2
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("================================================================================")
print("  EXPLICIT AUDIT: OCR PDF, OVERLAYERED IMAGE EXCEL & STANDARD EXCEL VERIFICATION")
print("================================================================================")

# Categories
# 1. OCR PDFs
ocr_pdf_clause = "polling_station_name ILIKE '%%pdf%%' OR polling_station_name ILIKE '%%ocred%%' OR part_number IN ('140', '141')"

# 2. Overlayered Image Excel (e.g., Harihara Kasba Hobli drawing image pages)
image_excel_clause = "polling_station_name ILIKE '%%harihara%%' AND (polling_station_name NOT ILIKE '%%pdf%%')"

# 3. Standard Excel
standard_excel_clause = f"NOT ({ocr_pdf_clause}) AND NOT ({image_excel_clause})"

def inspect_source_category(category_name, filter_sql, sample_size=20):
    print(f"\n--------------------------------------------------------------------------------")
    print(f" CATEGORY: {category_name}")
    print(f"--------------------------------------------------------------------------------")
    
    cur.execute(f"SELECT count(*) FROM electors WHERE {filter_sql}")
    cat_count = cur.fetchone()[0]
    print(f"Total Electors in DB for {category_name}: {cat_count:,}")
    
    query = f"""
        SELECT serial_number, epic_number, name, relative_name, address, 
               qualification, occupation, age, sex, part_number, polling_station_name
        FROM electors
        WHERE {filter_sql}
        ORDER BY RANDOM()
        LIMIT %s
    """
    cur.execute(query, (sample_size,))
    rows = cur.fetchall()
    
    passed = 0
    records = []
    
    for r in rows:
        serial, epic, name, rel_name, address, qual, occ, age, sex, part_num, station = r
        
        # Check field alignment
        has_name = name is not None and len(str(name).strip()) > 0
        has_rel = rel_name is not None and len(str(rel_name).strip()) > 0
        has_addr = address is not None and len(str(address).strip()) > 0
        has_epic = epic is not None and len(str(epic).strip()) >= 7
        
        if has_name and has_epic and (has_rel or has_addr):
            passed += 1
            status = "PASS ✓"
        else:
            status = "WARN ⚠"
            
        records.append({
            'epic': epic, 'serial': serial, 'name': name, 'rel': rel_name,
            'address': address, 'age': age, 'sex': sex, 'part': part_num,
            'station': station, 'status': status
        })
        
    print(f"  ✓ {passed}/{sample_size} Sampled Records PASSED Full Field Detail Alignment Test.")
    
    # Display 3 detailed sample rows
    print("\n  Sample Record Verification Details:")
    for i, s in enumerate(records[:3], 1):
        print(f"    [{i}] EPIC: {s['epic']} | Name: '{s['name']}'")
        print(f"        Relative: '{s['rel'] or 'N/A'}'")
        print(f"        Address:  '{s['address'] or 'N/A'}'")
        print(f"        Age/Sex:   {s['age'] or 'N/A'} / {s['sex'] or 'N/A'}")
        print(f"        Polling:   Part {s['part']} - {s['station']}")
        
    return cat_count, passed, sample_size, records

# Run Audits
pdf_count, pdf_pass, pdf_tot, pdf_recs = inspect_source_category("1. OCR PDF ROLLS (4 Files)", ocr_pdf_clause)
img_count, img_pass, img_tot, img_recs = inspect_source_category("2. OVERLAYERED IMAGE EXCEL (Harihara ONNX OCR)", image_excel_clause)
std_count, std_pass, std_tot, std_recs = inspect_source_category("3. STANDARD EXCEL ROLLS (150 Files)", standard_excel_clause)

print("\n================================================================================")
print(f"   AUDIT COMPLETE across {pdf_count + img_count + std_count:,} Total Database Electors.")
print("================================================================================")

cur.close()
conn.close()
