const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');
const files = fs.readdirSync(pollingDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

const masterPollingMap = {};

for (const file of files) {
    const filePath = path.join(pollingDir, file);
    try {
        const workbook = XLSX.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const cellKeys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
            
            // Group cells by row number
            const rowMap = {};
            for (const key of cellKeys) {
                const rowNum = key.replace(/[A-Z]/g, '');
                const colLetter = key.replace(/[0-9]/g, '');
                if (!rowMap[rowNum]) rowMap[rowNum] = {};
                rowMap[rowNum][colLetter] = String(worksheet[key].v || '').trim();
            }

            for (const r of Object.keys(rowMap)) {
                const row = rowMap[r];
                
                // Find column with part number (usually D, sometimes C or B)
                let partNo = null;
                let district = row['B'] || '';
                let taluk = row['C'] || '';
                let stationName = row['E'] || '';
                let area = row['F'] || '';

                // Try to find numeric Part Number in D, C, or B
                for (const colLetter of ['D', 'C', 'B', 'E', 'A']) {
                    const val = (row[colLetter] || '').trim();
                    if (/^\d{1,3}$/.test(val)) {
                        const num = parseInt(val, 10);
                        if (num >= 1 && num <= 200) {
                            partNo = String(num);
                            break;
                        }
                    }
                }

                if (!partNo) continue;

                // Clean stationName and area
                stationName = stationName.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                area = area.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                district = district.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
                taluk = taluk.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

                // Skip if stationName is empty or just header
                if (!stationName || stationName.toLowerCase().includes('part name') || stationName.toLowerCase().includes('taluk name')) continue;

                // Construct full polling address string
                let fullAddress = area;
                if (taluk) fullAddress += `, ${taluk} Taluk`;
                if (district) fullAddress += `, ${district} District`;
                fullAddress += `, Karnataka`;

                masterPollingMap[partNo] = {
                    part_number: partNo,
                    district: district,
                    taluk: taluk,
                    polling_station_name: stationName,
                    polling_address: fullAddress,
                    sourceFile: file,
                    sourceSheet: sheetName
                };
            }
        }
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
}

console.log(`\n========================================`);
console.log(`MASTER POLLING MAP BUILT: ${Object.keys(masterPollingMap).length} Parts mapped!`);
console.log(`Part Numbers mapped:`, Object.keys(masterPollingMap).sort((a,b)=>parseInt(a)-parseInt(b)).join(', '));
console.log(`========================================\n`);

console.log('Sample mappings for Parts 92 to 104 (Tumkur dataset):');
for (let p = 92; p <= 104; p++) {
    const info = masterPollingMap[String(p)];
    if (info) {
        console.log(`\nPart ${p}:`);
        console.log(`  Station: ${info.polling_station_name}`);
        console.log(`  Address: ${info.polling_address}`);
    } else {
        console.log(`\nPart ${p}: ❌ MISSING!`);
    }
}
