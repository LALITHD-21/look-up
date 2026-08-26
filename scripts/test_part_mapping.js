const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');
const masterPollingMap = {};

if (fs.existsSync(pollingDir)) {
    const pollingFiles = fs.readdirSync(pollingDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));
    for (const file of pollingFiles) {
        const filePath = path.join(pollingDir, file);
        try {
            const workbook = XLSX.readFile(filePath);
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const cellKeys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
                
                const rowMap = {};
                for (const key of cellKeys) {
                    const rowNum = key.replace(/[A-Z]/g, '');
                    const colLetter = key.replace(/[0-9]/g, '');
                    if (!rowMap[rowNum]) rowMap[rowNum] = {};
                    rowMap[rowNum][colLetter] = String(worksheet[key].v || '').trim();
                }

                for (const r of Object.keys(rowMap)) {
                    const row = rowMap[r];
                    let partNo = null;
                    let district = row['B'] || '';
                    let taluk = row['C'] || '';
                    let stationName = row['E'] || '';
                    let area = row['F'] || '';

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

                    stationName = stationName.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    area = area.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    area = area.replace(/(\d{1,2})\d{3,5}$/g, '$1').trim();

                    district = district.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
                    taluk = taluk.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

                    if (!stationName || stationName.toLowerCase().includes('part name') || stationName.toLowerCase().includes('taluk name')) continue;

                    let fullAddress = area;
                    if (taluk) fullAddress += `, ${taluk} Taluk`;
                    if (district) fullAddress += `, ${district} District`;
                    fullAddress += `, Karnataka`;

                    masterPollingMap[partNo] = {
                        part_number: partNo,
                        polling_station_name: stationName,
                        polling_address: fullAddress,
                    };
                }
            }
        } catch (e) {}
    }
}

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));

let missingPart = 0;
let totalVoters = 0;

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let currentPartNo = null;

            // Try to extract Part No from filename if not set (e.g. "tumkur city ward no 21-25 2026.xlsx")
            const filePartMatch = file.match(/ward\s*no\s*(\d+)/i) || file.match(/(\d+)/);

            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;

                const rowString = row.map(c => String(c || '').trim()).join(' ');
                const partMatch = rowString.match(/Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+[A-Za-z0-9\/\-]*)/i);
                if (partMatch) {
                    currentPartNo = partMatch[1].trim();
                }

                let epicVal = null;
                for (let idx = 0; idx < row.length; idx++) {
                    const cellText = String(row[idx] || '').trim();
                    const epicMatch = cellText.match(/\b([A-Z]{3}\d{7})\b/i);
                    if (epicMatch) epicVal = epicMatch[1].toUpperCase();
                }

                if (!epicVal) continue;
                totalVoters++;

                const finalPartNo = currentPartNo || (filePartMatch ? filePartMatch[1] : null);
                if (!finalPartNo) missingPart++;
            }
        }
    } catch (e) {}
}

console.log(`Part Mapping Test:
Total Extracted Voters: ${totalVoters}
Missing Part Number: ${missingPart}`);
