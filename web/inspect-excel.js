const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '../pdf/tumkur city ward no 26-30  2026\u00A0(1).xlsx');
const altPath = path.join(__dirname, '../pdf/tumkur city ward no 26-30  2026 (1).xlsx');

let targetPath = fs.existsSync(filePath) ? filePath : altPath;

if (!fs.existsSync(targetPath)) {
    const files = fs.readdirSync(path.join(__dirname, '../pdf'));
    const matched = files.find(f => f.includes('26-30'));
    if (matched) targetPath = path.join(__dirname, '../pdf', matched);
}

console.log('Target file path:', targetPath);

const workbook = XLSX.readFile(targetPath);
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Sheet "${sheetName}" total rows: ${rows.length}`);
    if (rows.length > 0) {
        console.log('Top 5 rows:', JSON.stringify(rows.slice(0, 5), null, 2));
    }
}
