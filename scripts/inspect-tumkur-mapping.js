const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');

function inspectFile(filename) {
    const filePath = path.join(pollingDir, filename);
    const workbook = XLSX.readFile(filePath);
    console.log(`\n========================================`);
    console.log(`FULL DATA PRINT: ${filename}`);
    console.log(`========================================`);

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        rows.forEach((r, idx) => {
            if (r && Array.isArray(r) && r.some(c => c !== null && c !== '')) {
                const rowStr = r.map((c, i) => `[Col ${i}]: "${String(c||'').trim()}"`).join(' | ');
                console.log(`Row ${idx}: ${rowStr}`);
            }
        });
    }
}

inspectFile('TUMKUR.xlsx');
