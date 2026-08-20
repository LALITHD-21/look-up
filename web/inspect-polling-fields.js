const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

console.log('--- Checking for Part / Polling fields across all 13 Excel files ---');

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            console.log(`\nFile: ${file} | Sheet: ${sheetName} | Total rows: ${rows.length}`);
            
            // Check top 25 rows for any text related to Part, Polling, Station, Address, Ward
            const keywords = ['part', 'polling', 'station', 'building', 'room', 'school', 'ward', 'booth', 'address', 'ps'];
            
            let foundHeaders = [];
            for (let i = 0; i < Math.min(30, rows.length); i++) {
                const row = rows[i];
                if (!row || !Array.isArray(row)) continue;
                const rowStr = row.map(c => String(c || '')).join(' | ');
                
                for (const kw of keywords) {
                    if (rowStr.toLowerCase().includes(kw)) {
                        foundHeaders.push(`Row ${i}: ${rowStr.slice(0, 150)}`);
                        break;
                    }
                }
            }

            console.log(`Matching header/title rows (${foundHeaders.length}):`);
            foundHeaders.slice(0, 8).forEach(h => console.log('  ', h));
        }
    } catch (e) {
        console.error(`Error inspecting ${file}:`, e.message);
    }
}
