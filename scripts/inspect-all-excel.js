const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

console.log(`Found ${files.length} Excel files in ${pdfDir}:`);

for (const file of files) {
    const filePath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(filePath);
        console.log(`\n=== File: ${file} ===`);
        console.log(`Sheets (${workbook.SheetNames.length}):`, workbook.SheetNames);
        
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`  Sheet [${sheetName}]: ${rows.length} rows`);
            if (rows.length > 0) {
                // Find first row with data
                const sampleRow = rows.find(r => r && Array.isArray(r) && r.some(c => c !== null && c !== ''));
                if (sampleRow) {
                    console.log(`    Sample row:`, sampleRow.slice(0, 10));
                }
            }
        }
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
}
