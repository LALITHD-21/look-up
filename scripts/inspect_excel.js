const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`=== FILE: ${file} ===`);
        let count = 0;
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.map(c => String(c || '').trim()).join(' | ');
            if (/[A-Z]{3}\d{7}/i.test(rowStr)) {
                console.log(`Row ${r}:`);
                row.forEach((cell, idx) => {
                    const val = String(cell || '').trim();
                    if (val) console.log(`   Col [${idx}]: "${val}"`);
                });
                count++;
                if (count >= 2) break; // show 2 sample voter rows per file
            }
        }
        console.log('\n');
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
}
