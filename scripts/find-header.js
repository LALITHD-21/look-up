const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const targetPath = path.join(__dirname, '../pdf/tumkur city ward no 26-30  2026\u00A0(1).xlsx');
const workbook = XLSX.readFile(targetPath);
const worksheet = workbook.Sheets['Table 1'];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

for (let i = 0; i < Math.min(50, rows.length); i++) {
    const row = rows[i];
    if (row && row.length > 0) {
        const rowStr = row.map(c => String(c || '').trim()).join(' | ');
        if (rowStr.toLowerCase().includes('epic') || rowStr.toLowerCase().includes('name') || rowStr.toLowerCase().includes('sl')) {
            console.log(`Row ${i}: ${rowStr}`);
        }
    }
}
