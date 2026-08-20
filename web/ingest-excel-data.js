const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
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

// Find the target Excel file
const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir);
const matchedFile = files.find(f => f.includes('26-30') && f.endsWith('.xlsx'));

if (!matchedFile) {
    console.error('Target Excel file not found in pdf directory');
    process.exit(1);
}

const targetPath = path.join(pdfDir, matchedFile);
console.log('Ingesting Excel dataset:', targetPath);

const workbook = XLSX.readFile(targetPath);
const validRecords = [];
const seenEpics = new Set();

for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    for (const row of rows) {
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        // Search row for EPIC number pattern: ^[A-Z]{3}\d{7}$
        let epicVal = null;
        let nameVal = null;
        let relVal = null;
        let addrVal = null;
        let qualVal = null;
        let occVal = null;
        let ageVal = null;
        let sexVal = null;
        let snoVal = null;

        // Scan all cells in the row to extract fields flexibly
        for (let idx = 0; idx < row.length; idx++) {
            const cellText = String(row[idx] || '').trim();
            if (!cellText) continue;

            const epicMatch = cellText.match(/\b([A-Z]{3}\d{7})\b/i);
            if (epicMatch) {
                epicVal = epicMatch[1].toUpperCase();
            }
        }

        if (!epicVal || seenEpics.has(epicVal)) continue;

        // Extract cells by index or pattern
        for (let idx = 0; idx < row.length; idx++) {
            const val = String(row[idx] || '').trim();
            if (!val) continue;

            if (/^\d{1,4}$/.test(val) && !snoVal) {
                const num = parseInt(val, 10);
                if (num > 0 && num < 5000) snoVal = num;
            }

            if (/\b(1[89]|[2-9]\d|1[01]\d)\b/.test(val) && !ageVal && val !== String(snoVal)) {
                const num = parseInt(val, 10);
                if (num >= 18 && num <= 120) ageVal = num;
            }

            if (/^(M|F|Male|Female)$/i.test(val) && !sexVal) {
                sexVal = val.toUpperCase().startsWith('M') ? 'M' : 'F';
            }
        }

        // Field assignments based on row structure
        if (row[1]) nameVal = String(row[1]).trim().replace(/\s+/g, ' ');
        if (row[5]) relVal = String(row[5]).trim().replace(/\s+/g, ' ');
        if (row[8]) addrVal = String(row[8]).trim().replace(/\s+/g, ' ');
        if (row[12]) qualVal = String(row[12]).trim();
        if (row[13]) occVal = String(row[13]).trim();

        if (!nameVal || nameVal.toLowerCase().includes('name of the elector') || nameVal.toLowerCase().includes('sino')) {
            continue;
        }

        seenEpics.add(epicVal);
        validRecords.push({
            epic_number: epicVal,
            name: nameVal,
            relative_name: relVal || null,
            address: addrVal || null,
            qualification: qualVal || null,
            occupation: occVal || null,
            age: ageVal || null,
            sex: sexVal || null,
            serial_number: snoVal || null,
            part_number: null,
            polling_station_name: null,
            polling_address: null,
            photo_url: null
        });
    }
}

console.log(`Parsed ${validRecords.length} valid elector records with unique EPIC numbers.`);

async function runIngest() {
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < validRecords.length; i += batchSize) {
        const chunk = validRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('electors').upsert(chunk, { onConflict: 'epic_number' });

        if (error) {
            console.error(`Error ingesting chunk ${i}..${i + batchSize}:`, error.message);
            process.exit(1);
        }
        inserted += chunk.length;
        console.log(`Ingested ${inserted}/${validRecords.length} records into Supabase...`);
    }

    console.log('SUCCESS: All records ingested successfully!');
    
    // Verify count
    const { count, error: countError } = await supabase.from('electors').select('*', { count: 'exact', head: true });
    if (!countError) {
        console.log(`Total elector rows in database: ${count}`);
    }
}

runIngest();
