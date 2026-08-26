const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

const partDetails = {};

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let currentPartNo = null;

            for (let i = 0; i < Math.min(40, rows.length); i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row)) continue;
                const rowString = row.map(c => String(c || '').trim()).join(' ');

                const partMatch = rowString.match(/Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+[A-Za-z0-9\/\-]*)/i);
                if (partMatch) {
                    currentPartNo = partMatch[1].trim();
                }
            }

            if (currentPartNo) {
                partDetails[currentPartNo] = {
                    file: file,
                    headers: rows.slice(0, 10).map(r => Array.isArray(r) ? r.map(c=>String(c||'').trim()).filter(Boolean).join(' | ') : '').filter(Boolean)
                };
            }
        }
    } catch (e) {}
}

console.log('=== PART DETAILS SUMMARY ===');
for (const partNo of Object.keys(partDetails).sort((a,b)=>parseInt(a)-parseInt(b))) {
    console.log(`\nPart Number: ${partNo}`);
    console.log(`Source File: ${partDetails[partNo].file}`);
    console.log(`Header lines:`);
    partDetails[partNo].headers.forEach(h => console.log('  ', h));
}
