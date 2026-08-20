const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');
const files = fs.readdirSync(pollingDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

const allMappings = [];

for (const file of files) {
    const filePath = path.join(pollingDir, file);
    try {
        const workbook = XLSX.readFile(filePath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            for (const r of rows) {
                if (!r || !Array.isArray(r) || r.length < 3) continue;
                
                // Look for rows that have numbers or part numbers
                const cells = r.map(c => String(c || '').trim());
                // Skip header rows
                if (cells.join(' ').toLowerCase().includes('district name') || cells.join(' ').toLowerCase().includes('karnataka south-east')) continue;

                // Output non-empty cells
                const nonNull = cells.filter(Boolean);
                if (nonNull.length >= 3) {
                    allMappings.push({
                        file,
                        sheet: sheetName,
                        cells: cells
                    });
                }
            }
        }
    } catch (e) {}
}

console.log(`Extracted ${allMappings.length} mapping rows across files:`);
allMappings.slice(0, 35).forEach((m, idx) => {
    console.log(`[${idx+1}] File: ${m.file} | Sheet: ${m.sheet}`);
    console.log(`  Cells:`, m.cells);
});
