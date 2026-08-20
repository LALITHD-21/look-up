const fs = require('fs');
const path = require('path');
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule);
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from etl/.env or web/.env.local
let envContent = '';
try {
    envContent = fs.readFileSync(path.join(__dirname, '../etl/.env'), 'utf8');
} catch (e) {
    try {
        envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    } catch (e2) {}
}

const env = {};
for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[match[1]] = value.trim();
    }
}

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials in etl/.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Find PDF files in pdf directory
const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir);
const pdfFiles = files.filter(f => f.endsWith('.pdf'));

console.log('Found PDF files:', pdfFiles);

async function processPdfFile(fileName) {
    const filePath = path.join(pdfDir, fileName);
    console.log(`Reading PDF: ${fileName} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(1)} MB)...`);

    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    console.log(`Extracted text from ${pdfData.numpages} pages.`);

    const fullText = pdfData.text || '';
    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const epicRegex = /([A-Z]{3}\d{7})/gi;
    const records = [];
    const seenEpics = new Set();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = epicRegex.exec(line);
        epicRegex.lastIndex = 0;

        if (match) {
            const epic = match[1].toUpperCase();
            if (seenEpics.has(epic)) continue;

            let ageVal = null;
            let sexVal = null;
            let slNo = null;

            if (/\bM\b/i.test(line)) sexVal = 'M';
            else if (/\bF\b/i.test(line)) sexVal = 'F';

            const ageMatch = line.match(/\b(1[89]|[2-9]\d|1[01]\d)\b/);
            if (ageMatch) ageVal = parseInt(ageMatch[1], 10);

            const slMatch = line.match(/^\d+/);
            if (slMatch) slNo = parseInt(slMatch[0], 10);

            const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);
            let nameVal = parts.length >= 2 ? parts[1] : `Elector (${epic})`;

            seenEpics.add(epic);
            records.push({
                epic_number: epic,
                name: nameVal,
                relative_name: parts[2] || null,
                address: parts[3] || null,
                age: ageVal,
                sex: sexVal,
                serial_number: slNo,
                photo_url: null
            });
        }
    }

    console.log(`Extracted ${records.length} unique EPIC records from ${fileName}.`);

    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const chunk = records.slice(i, i + batchSize);
        const { error } = await supabase.from('electors').upsert(chunk, { onConflict: 'epic_number' });

        if (error) {
            console.error(`Ingestion error: ${error.message}`);
            break;
        }
        inserted += chunk.length;
    }

    console.log(`Successfully ingested ${inserted} records into Supabase.`);
}

async function runAll() {
    for (const f of pdfFiles) {
        await processPdfFile(f);
    }

    const { count } = await supabase.from('electors').select('*', { count: 'exact', head: true });
    console.log(`Total database count after PDF ingestion: ${count}`);
}

runAll();
