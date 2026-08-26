const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            console.log(`\n=== File: ${file} ===`);
            for (let i = 0; i < Math.min(15, rows.length); i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row)) continue;
                const filtered = row.map(c => String(c || '').trim()).filter(Boolean);
                if (filtered.length > 0) {
                    console.log(`Row ${i}:`, filtered.join(' | '));
                }
            }
        }
    } catch (e) {}
}
