const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

let totalVoters = 0;
let votersWithPart = 0;
const partCounts = {};

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let currentPartNo = null;
            let currentArea = null;

            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;

                const rowString = row.map(c => String(c || '').trim()).join(' ');

                // 1. Match Part No in header or row
                // Examples: "Part No: 99", "Part N o: 104", "Part No· 103", "Part  No: 98"
                const partMatch = rowString.match(/Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+[A-Za-z0-9\/\-]*)/i);
                if (partMatch) {
                    currentPartNo = partMatch[1].trim();
                }

                // 2. Match Area / Hobli / Ward
                const areaMatch = rowString.match(/Area\s*:\s*([^\|\n]+)/i);
                if (areaMatch) {
                    currentArea = areaMatch[1].trim();
                }

                // Check for EPIC
                let epicVal = null;
                for (let idx = 0; idx < row.length; idx++) {
                    const cellText = String(row[idx] || '').trim();
                    if (!cellText) continue;
                    const epicMatch = cellText.match(/\b([A-Z]{3}\d{7})\b/i);
                    if (epicMatch) {
                        epicVal = epicMatch[1].toUpperCase();
                    }
                }

                if (epicVal) {
                    totalVoters++;
                    if (currentPartNo) {
                        votersWithPart++;
                        partCounts[currentPartNo] = (partCounts[currentPartNo] || 0) + 1;
                    }
                }
            }
        }
    } catch (e) {}
}

console.log(`\n========================================`);
console.log(`Total Voters Extracted: ${totalVoters}`);
console.log(`Voters with Part Number: ${votersWithPart} (${((votersWithPart/totalVoters)*100).toFixed(1)}%)`);
console.log(`Unique Part Numbers Found (${Object.keys(partCounts).length}):`, Object.keys(partCounts).sort((a,b)=>parseInt(a)-parseInt(b)).join(', '));
console.log(`========================================\n`);
