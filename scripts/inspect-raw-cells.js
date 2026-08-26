const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pollingDir = path.join(__dirname, '../poling addres');

function inspectRawSheet(filename, sheetName) {
    const filePath = path.join(pollingDir, filename);
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`\n========================================`);
    console.log(`Raw inspection of ${filename} -> ${sheetName}`);
    console.log(`Range:`, worksheet['!ref']);
    
    // Dump all cell keys that have values
    const cellKeys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
    console.log(`Total non-meta cells: ${cellKeys.length}`);
    
    // Group by row
    const rowMap = {};
    for (const key of cellKeys) {
        const rowNum = key.replace(/[A-Z]/g, '');
        if (!rowMap[rowNum]) rowMap[rowNum] = [];
        rowMap[rowNum].push(`${key}: ${JSON.stringify(worksheet[key].v)}`);
    }

    for (const r of Object.keys(rowMap).sort((a,b)=>parseInt(a)-parseInt(b))) {
        console.log(`Row ${r}:`, rowMap[r].join(' | '));
    }
}

inspectRawSheet('Davanagere- Sheet2.xlsx', 'Sheet1');
inspectRawSheet('TUMKUR.xlsx', 'Sheet1');
