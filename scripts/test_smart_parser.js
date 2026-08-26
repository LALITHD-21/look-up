const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));

let totalVoters = 0;
let missingAddress = 0;
let missingRelative = 0;
let missingAge = 0;
let missingSex = 0;

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;

                let epicVal = null;
                for (let idx = 0; idx < row.length; idx++) {
                    const cellText = String(row[idx] || '').trim();
                    const epicMatch = cellText.match(/\b([A-Z]{3}\d{7})\b/i);
                    if (epicMatch) epicVal = epicMatch[1].toUpperCase();
                }

                if (!epicVal) continue;

                // Smart cell extraction
                let nameVal = '';
                let relVal = '';
                let addrVal = '';
                let qualVal = '';
                let occVal = '';
                let ageVal = null;
                let sexVal = null;
                let snoVal = null;

                // Scan cells
                for (let idx = 0; idx < row.length; idx++) {
                    const val = String(row[idx] || '').trim();
                    if (!val) continue;

                    // Serial Number
                    if (/^(#\s*)?\d{1-[0-9]+}$/.test(val) || (/^\d{1,5}$/.test(val) && !snoVal && idx === 0)) {
                        const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
                        if (num > 0 && num < 10000) snoVal = num;
                    }

                    // Age
                    if (/\b(1[89]|[2-9]\d|1[01]\d)\b/.test(val) && !ageVal && val !== String(snoVal)) {
                        const num = parseInt(val, 10);
                        if (num >= 18 && num <= 120) ageVal = num;
                    }

                    // Sex
                    if (/^(M|F|Male|Female)$/i.test(val) && !sexVal) {
                        sexVal = val.toUpperCase().startsWith('M') ? 'M' : 'F';
                    }
                }

                // Name: Column 1
                if (row[1]) nameVal = String(row[1]).trim().replace(/\s+/g, ' ');

                // Relative Name: Column 4 or 5
                if (row[4] && !/\d/.test(String(row[4])) && String(row[4]).length > 2) {
                    relVal = String(row[4]).trim().replace(/\s+/g, ' ');
                } else if (row[5]) {
                    relVal = String(row[5]).trim().replace(/\s+/g, ' ');
                }

                // Address: Column 7 or 8
                for (const colIdx of [7, 8, 9, 6]) {
                    const cellStr = String(row[colIdx] || '').trim();
                    if (cellStr && (cellStr.includes('Karnataka') || cellStr.includes('Tumkur') || cellStr.includes('TUM') || cellStr.includes('VTC') || cellStr.includes('Post') || cellStr.includes('Dist') || cellStr.includes('Tq') || cellStr.length > 15)) {
                        addrVal = cellStr.replace(/\s+/g, ' ');
                        break;
                    }
                }

                // Qualification & Occupation
                for (const colIdx of [11, 12, 13, 14]) {
                    const cellStr = String(row[colIdx] || '').trim();
                    if (!cellStr || cellStr === '-' || cellStr.includes('Photo')) continue;
                    if (!qualVal && (cellStr.length < 25)) {
                        qualVal = cellStr;
                    } else if (!occVal && cellStr !== qualVal) {
                        occVal = cellStr;
                    }
                }

                if (!nameVal || nameVal.toLowerCase().includes('name of the elector')) continue;

                totalVoters++;
                if (!addrVal) missingAddress++;
                if (!relVal) missingRelative++;
                if (!ageVal) missingAge++;
                if (!sexVal) missingSex++;

                // Print first sample voter
                if (totalVoters === 1 || totalVoters === 500) {
                    console.log(`Sample Voter #${totalVoters}:`, {
                        epic: epicVal,
                        name: nameVal,
                        relative: relVal,
                        address: addrVal,
                        qual: qualVal,
                        occ: occVal,
                        age: ageVal,
                        sex: sexVal,
                        sno: snoVal
                    });
                }
            }
        }
    } catch (e) {
        console.error(`Error:`, e);
    }
}

console.log(`\nResults:
Total Extracted Voters: ${totalVoters}
Missing Address: ${missingAddress} (${((missingAddress/totalVoters)*100).toFixed(1)}%)
Missing Relative Name: ${missingRelative} (${((missingRelative/totalVoters)*100).toFixed(1)}%)
Missing Age: ${missingAge}
Missing Sex: ${missingSex}`);
