const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');
const files = fs.readdirSync(pollingDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

for (const file of files) {
    const filePath = path.join(pollingDir, file);
    const workbook = XLSX.readFile(filePath);
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        // Convert to array of objects or raw json
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (data.length > 0) {
            console.log(`\n--- Sheet: ${sheetName} (${data.length} records) ---`);
            console.log('Keys:', Object.keys(data[0]));
            data.slice(0, 5).forEach((item, idx) => {
                console.log(`Record ${idx+1}:`, item);
            });
        }
    }
}
