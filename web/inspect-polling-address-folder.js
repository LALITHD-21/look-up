const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');
const files = fs.readdirSync(pollingDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

console.log(`Found ${files.length} polling address mapping files:`);

for (const file of files) {
    const filePath = path.join(pollingDir, file);
    try {
        const workbook = XLSX.readFile(filePath);
        console.log(`\n========================================`);
        console.log(`FILE: ${file}`);
        console.log(`Sheets (${workbook.SheetNames.length}):`, workbook.SheetNames);
        
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log(`\n  --- Sheet: [${sheetName}] (${rows.length} rows) ---`);
            
            for (let i = 0; i < Math.min(10, rows.length); i++) {
                const r = rows[i];
                if (r && Array.isArray(r) && r.some(c => c !== null && c !== '')) {
                    console.log(`  Row ${i}:`, r.map(c => String(c || '').trim()).join(' | '));
                }
            }
        }
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
}
