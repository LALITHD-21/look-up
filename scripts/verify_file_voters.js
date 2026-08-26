const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '..', 'pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$')).sort();

let totalExtractedVoters = 0;
const fileSummary = [];
const zeroVoterFiles = [];

for (const file of files) {
    const filePath = path.join(pdfDir, file);
    let count = 0;
    try {
        const workbook = XLSX.readFile(filePath, { cellDates: false });
        for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;
                const rowStr = row.map(c => String(c || '').trim()).join(' ');
                const rowLower = rowStr.toLowerCase();

                if (!rowStr) continue;

                // Check for EPIC or voter name
                const hasEpic = /\b[A-Z]{3}\d{7}\b/i.test(rowStr);
                const hasNameCol = row[1] && String(row[1]).trim().length > 1 && !rowLower.includes('name of the elector') && !rowLower.includes('sino');

                if (hasEpic || hasNameCol) {
                    count++;
                }
            }
        }
    } catch (e) {
        console.error('Error reading', file, e.message);
    }

    if (count === 0) {
        zeroVoterFiles.push(file);
    } else {
        totalExtractedVoters += count;
        fileSummary.push({ file, count });
    }
}

console.log('====================================================');
console.log('ACCURATE PER-FILE VOTER EXTRACTION SUMMARY:');
console.log('Files with voter data:       ', fileSummary.length, '/', files.length);
console.log('Total True Voter Rows:        ', totalExtractedVoters);
console.log('Files with 0 voters (images): ', zeroVoterFiles.length);
if (zeroVoterFiles.length > 0) {
    console.log('Image / Scanned files (no text cells):', zeroVoterFiles);
}
console.log('====================================================');
