const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function main() {
    const pdfPath = path.join(__dirname, '../pdf/Tumkur voter list-2026.pdf');
    const buffer = fs.readFileSync(pdfPath);
    console.log('Loading PDF...');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log('Text extracted successfully!');
    console.log('Sample text:', result.text ? result.text.slice(0, 500) : result.slice ? result.slice(0, 500) : JSON.stringify(result).slice(0, 500));
}

main().catch(err => console.error('Error:', err));
