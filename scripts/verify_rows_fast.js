const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '..', 'pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$')).sort();

let totalRaw = 0;
let totalHeaders = 0;
let totalVoters = 0;

for (const file of files) {
    const filePath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(filePath, { cellDates: false });
        for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            totalRaw += rows.length;

            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;
                const rowStr = row.map(c => String(c || '').trim()).join(' ').toLowerCase();

                if (!rowStr) continue;

                if (rowStr.includes('name of the elector') || rowStr.includes('sino') || rowStr.includes('part n') || rowStr.includes('table of content') || rowStr.includes('details of the roll') || rowStr.includes('final electoral roll')) {
                    totalHeaders++;
                } else if (row.some(c => String(c || '').trim().length > 0)) {
                    totalVoters++;
                }
            }
        }
    } catch (e) {
        console.error('Error reading', file, e.message);
    }
}

console.log('====================================================');
console.log('FAST ROW ANALYSIS SUMMARY:');
console.log('Total Raw Rows across 151 files:     ', totalRaw);
console.log('Total Header/Metadata Rows:          ', totalHeaders);
console.log('Total Actual Voter Rows Extracted:   ', totalVoters);
console.log('====================================================');
