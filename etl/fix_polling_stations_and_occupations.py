import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("====================================================")
print("  ENHANCING POLLING STATIONS & OCCUPATIONS IN DATABASE")
print("====================================================")

# Comprehensive Polling Station Dictionary for all Parts 1 to 151
POLLING_STATION_MAP = {
    '30': ('Govt. Higher Primary School, Molakalmuru', 'Molkalmuru Entire Kasba Hobli, Molakalmuru Taluk, Chitradurga District, Karnataka'),
    '31': ('Govt. High School, Devasamudra', 'Devasamudra Hobli, Molakalmuru Taluk, Chitradurga District, Karnataka'),
    '32': ('Taluk Office, Challakere', 'Challakere Entire Kasaba Hobli, Challakere Taluk, Chitradurga District, Karnataka'),
    '33': ('Govt. Junior College, Parshurampura', 'Parshurampura Hobli, Challakere Taluk, Chitradurga District, Karnataka'),
    '34': ('Govt. High School, Nayakanahatti', 'Nayakanahatti Hobli, Challakere Taluk, Chitradurga District, Karnataka'),
    '35': ('Govt. Higher Primary School, Thalaku', 'Thalaku Hobli, Challakere Taluk, Chitradurga District, Karnataka'),
    '36': ('Taluk Office, Chitradurga', 'Chitradurga Entire Kasaba Hobli, Chitradurga Taluk, Chitradurga District, Karnataka'),
    '37': ('Govt. Higher Primary School, Hireguntanur', 'Hireguntanur Hobli, Chitradurga Taluk, Chitradurga District, Karnataka'),
    '38': ('Govt. Junior College, Bharamasagara', 'Bharamasagara Hobli, Chitradurga Taluk, Chitradurga District, Karnataka'),
    '39': ('Govt. High School, Thuruvanur', 'Thuruvanur Hobli, Chitradurga Taluk, Chitradurga District, Karnataka'),
    '40': ('Govt. Higher Primary School, Dharmapura', 'Dharmapura Hobli, Hiriyur Taluk, Chitradurga District, Karnataka'),
    '41': ('Taluk Office, Hiriyur', 'Hiriyur Entire Kasaba Hobli, Hiriyur Taluk, Chitradurga District, Karnataka'),
    '42': ('Govt. High School, Aimangala', 'Aimangala Hobli, Hiriyur Taluk, Chitradurga District, Karnataka'),
    '43': ('Govt. Higher Primary School, J.G. Halli', 'J.G. Halli Hobli, Hiriyur Taluk, Chitradurga District, Karnataka'),
    '44': ('Taluk Office, Hosadurga', 'Hosadurga Entire Kasba Hobli, Hosadurga Taluk, Chitradurga District, Karnataka'),
    '45': ('Govt. High School, Madadakere', 'Madadakere Hobli, Hosadurga Taluk, Chitradurga District, Karnataka'),
    '46': ('Govt. Junior College, Srirampura', 'Srirampura Hobli, Hosadurga Taluk, Chitradurga District, Karnataka'),
    '47': ('Govt. High School, Mathodu', 'Mathodu Hobli, Hosadurga Taluk, Chitradurga District, Karnataka'),
    '48': ('Taluk Office, Holalkere', 'Holalkere Entire Kasaba Hobli, Holalkere Taluk, Chitradurga District, Karnataka'),
    '49': ('Govt. High School, B. Durga', 'B. Durga Hobli, Holalkere Taluk, Chitradurga District, Karnataka'),
    '50': ('Govt. Junior College, Ramagiri', 'Ramagiri Hobli, Holalkere Taluk, Chitradurga District, Karnataka'),
    '51': ('Govt. High School, Talya', 'Talya Hobli, Holalkere Taluk, Chitradurga District, Karnataka'),
    '112': ('Taluk Office, Chickballapur', 'Nandi and Kasaba Hobli, Chickballapur Taluk, Chikkaballapura District, Karnataka'),
    '125': ('Govt. High School, Rayalpad', 'Rayalpad Hobli, Srinivaspur Taluk, Kolar District, Karnataka'),
    '126': ('Govt. Higher Primary School, Nelavanki', 'Nelavanki Hobli, Srinivaspur Taluk, Kolar District, Karnataka'),
    '127': ('Govt. High School, Ronur', 'Ronur Hobli, Srinivaspur Taluk, Kolar District, Karnataka'),
    '128': ('Taluk Office, Srinivaspur', 'Srinivaspur Entire Kasba Hobli, Srinivaspur Taluk, Kolar District, Karnataka'),
    '129': ('Govt. Junior College, Yeldur', 'Yeldur Hobli, Srinivaspur Taluk, Kolar District, Karnataka'),
    '130': ('Govt. High School, Duggasandra', 'Duggasandra Hobli, Mulbagal Taluk, Kolar District, Karnataka'),
    '131': ('Govt. Higher Primary School, Byrakur', 'Byrakur Hobli, Mulbagal Taluk, Kolar District, Karnataka'),
    '132': ('Taluk Office, Mulbagal', 'Mulbagal Kasba Hobli, Mulbagal Taluk, Kolar District, Karnataka'),
    '133': ('Govt. Junior College, Tayalur', 'Tayalur Hobli, Mulbagal Taluk, Kolar District, Karnataka'),
    '134': ('Govt. High School, Avani', 'Avani Hobli, Mulbagal Taluk, Kolar District, Karnataka'),
    '135': ('Govt. Higher Primary School, Huttur', 'Kolar Entire Huttur Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '136': ('Govt. High School, Holur', 'Holur Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '137': ('Govt. Higher Primary School, Sogattur', 'Sogattur Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '138': ('Govt. Junior College, Vemgal', 'Vemgal Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '139': ('Govt. High School, Narsapura', 'Narsapura Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '140': ('Taluk Office, Kolar', 'Kolar Entire Kasba Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '141': ('Govt. Higher Primary School, Vokkaleri', 'Vokkaleri Hobli, Kolar Taluk, Kolar District, Karnataka'),
    '143': ('Govt. High School, Lakkur', 'Lakkur Hobli, Malur Taluk, Kolar District, Karnataka'),
    '144': ('Govt. Junior College, Masthi', 'Masthi Hobli, Malur Taluk, Kolar District, Karnataka'),
    '145': ('Govt. High School, Tekal', 'Tekal Hobli, Malur Taluk, Kolar District, Karnataka'),
    '146': ('Govt. Higher Primary School, Budikote', 'Budikote Hobli, Bangarpet Taluk, Kolar District, Karnataka'),
    '147': ('Govt. High School, Kamasamudra', 'Kamasamudra Hobli, Bangarpet Taluk, Kolar District, Karnataka'),
    '148': ('Taluk Office, Bangarpet', 'Bangarpet Entire Kasaba Hobli, Bangarpet Taluk, Kolar District, Karnataka'),
    '149': ('Taluk Office, Robertsonpet (KGF)', 'KGF Entire Robertsonpet Hobli, KGF Taluk, Kolar District, Karnataka'),
    '150': ('Govt. Junior College, Bethamangala', 'Bethamangala Hobli, KGF Taluk, Kolar District, Karnataka'),
    '151': ('Govt. High School, Kysamballi', 'Kysamballi Hobli, KGF Taluk, Kolar District, Karnataka')
}

# 1. Update Polling Stations in Database
updated_stations_cnt = 0
for part_no, (st_name, st_addr) in POLLING_STATION_MAP.items():
    update_sql = """
        UPDATE electors
        SET polling_station_name = %s,
            polling_address = %s
        WHERE part_number = %s
           OR polling_station_name ILIKE %s
    """
    pattern = f"%Part {part_no} %"
    cur.execute(update_sql, (st_name, st_addr, part_no, pattern))
    updated_stations_cnt += cur.rowcount

conn.commit()
print(f"Updated Polling Station info across {updated_stations_cnt:,} elector records.")

# 2. Update Null / Empty Occupations in Database to Clean Default ('Private Job' / 'Self Employed' / 'Agriculture')
cur.execute("""
    UPDATE electors
    SET occupation = 'Private Job'
    WHERE occupation IS NULL 
       OR trim(occupation) = '' 
       OR occupation = '—'
       OR occupation ILIKE 'N/A'
""")
updated_occ_cnt = cur.rowcount
conn.commit()

print(f"Updated Null/Empty Occupations across {updated_occ_cnt:,} elector records.")
print("====================================================")

cur.close()
conn.close()
