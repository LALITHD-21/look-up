import sys
from pathlib import Path
import openpyxl

sys.path.append("C:/Users/techb/Desktop/electoral-portal-main/etl")
from polling import load_polling_parts_mapping

pm = load_polling_parts_mapping("C:/Users/techb/Desktop/electoral-portal-main/poling addres")

print("====================================================")
print(f"Total Polling Parts Loaded: {len(pm)}")
print("====================================================")

for p in sorted(pm.keys(), key=lambda x: int(x) if x.isdigit() else 9999):
    info = pm[p]
    print(f"Part {p:>3}: Station: '{info['polling_station_name']}' | Addr: '{info['polling_address']}'")

print("====================================================")
