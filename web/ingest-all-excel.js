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

// ============================================================
// STAGE 1: Build Master Polling Station Map from `poling addres/`
// ============================================================
const pollingDir = path.join(__dirname, '../poling addres');
const masterPollingMap = {};

if (fs.existsSync(pollingDir)) {
    const pollingFiles = fs.readdirSync(pollingDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));
    console.log(`Found ${pollingFiles.length} official Polling Address mapping files in 'poling addres/'...`);

    for (const file of pollingFiles) {
        const filePath = path.join(pollingDir, file);
        try {
            const workbook = XLSX.readFile(filePath);
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const cellKeys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
                
                // Group cells by row number
                const rowMap = {};
                for (const key of cellKeys) {
                    const rowNum = key.replace(/[A-Z]/g, '');
                    const colLetter = key.replace(/[0-9]/g, '');
                    if (!rowMap[rowNum]) rowMap[rowNum] = {};
                    rowMap[rowNum][colLetter] = String(worksheet[key].v || '').trim();
                }

                for (const r of Object.keys(rowMap)) {
                    const row = rowMap[r];
                    
                    let partNo = null;
                    let district = row['B'] || '';
                    let taluk = row['C'] || '';
                    let stationName = row['E'] || '';
                    let area = row['F'] || '';

                    // Try to find numeric Part Number in D, C, or B
                    for (const colLetter of ['D', 'C', 'B', 'E', 'A']) {
                        const val = (row[colLetter] || '').trim();
                        if (/^\d{1,3}$/.test(val)) {
                            const num = parseInt(val, 10);
                            if (num >= 1 && num <= 200) {
                                partNo = String(num);
                                break;
                            }
                        }
                    }

                    if (!partNo) continue;

                    // Clean stationName and area
                    stationName = stationName.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    area = area.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    
                    // Strip trailing voter totals from area string while preserving ward numbers (e.g. "Entire Ward No.01 to 05738" -> "Entire Ward No.01 to 05")
                    area = area.replace(/(\d{1,2})\d{3,5}$/g, '$1').trim();

                    district = district.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
                    taluk = taluk.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();

                    if (!stationName || stationName.toLowerCase().includes('part name') || stationName.toLowerCase().includes('taluk name')) continue;

                    // Construct full polling address string
                    let fullAddress = area;
                    if (taluk) fullAddress += `, ${taluk} Taluk`;
                    if (district) fullAddress += `, ${district} District`;
                    fullAddress += `, Karnataka`;

                    masterPollingMap[partNo] = {
                        part_number: partNo,
                        polling_station_name: stationName,
                        polling_address: fullAddress,
                    };
                }
            }
        } catch (e) {
            console.error(`Error reading polling address file ${file}:`, e.message);
        }
    }
}

console.log(`✓ Successfully mapped ${Object.keys(masterPollingMap).length} Parts from 'poling addres/' folder!`);

// ============================================================
// STAGE 2: Parse Elector Datasets from `pdf/` & Ingest
// ============================================================
const pdfDir = path.join(__dirname, '../pdf');
const files = fs.readdirSync(pdfDir).filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));

console.log(`\nFound ${files.length} Elector Roll datasets in 'pdf/'. Processing...`);

const validRecords = [];
const seenEpics = new Set();
let totalProcessedFiles = 0;

for (const file of files) {
    const targetPath = path.join(pdfDir, file);
    let fileRecordCount = 0;

    try {
        const workbook = XLSX.readFile(targetPath);
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let currentPartNo = null;

            for (const row of rows) {
                if (!row || !Array.isArray(row) || row.length === 0) continue;

                const rowString = row.map(c => String(c || '').trim()).join(' ');

                // Match Part No in header or row
                const partMatch = rowString.match(/Part\s*N?\s*o?\s*[\:\.\·\-\s]\s*(\d+[A-Za-z0-9\/\-]*)/i);
                if (partMatch) {
                    currentPartNo = partMatch[1].trim();
                }

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

                for (let idx = 0; idx < row.length; idx++) {
                    const cellText = String(row[idx] || '').trim();
                    if (!cellText) continue;

                    const epicMatch = cellText.match(/\b([A-Z]{3}\d{7})\b/i);
                    if (epicMatch) {
                        epicVal = epicMatch[1].toUpperCase();
                    }
                }

                if (!epicVal || seenEpics.has(epicVal)) continue;

                // Extract numeric & categorical fields
                for (let idx = 0; idx < row.length; idx++) {
                    const val = String(row[idx] || '').trim();
                    if (!val) continue;

                    if (/^\d{1,5}$/.test(val) && !snoVal) {
                        const num = parseInt(val, 10);
                        if (num > 0 && num < 10000) snoVal = num;
                    }

                    if (/\b(1[89]|[2-9]\d|1[01]\d)\b/.test(val) && !ageVal && val !== String(snoVal)) {
                        const num = parseInt(val, 10);
                        if (num >= 18 && num <= 120) ageVal = num;
                    }

                    if (/^(M|F|Male|Female)$/i.test(val) && !sexVal) {
                        sexVal = val.toUpperCase().startsWith('M') ? 'M' : 'F';
                    }
                }

                // Positional cell assignments for standard Graduate Roll format
                if (row[1]) nameVal = String(row[1]).trim().replace(/\s+/g, ' ');
                if (row[5]) relVal = String(row[5]).trim().replace(/\s+/g, ' ');
                if (row[8]) addrVal = String(row[8]).trim().replace(/\s+/g, ' ');
                if (row[12]) qualVal = String(row[12]).trim();
                if (row[13]) occVal = String(row[13]).trim();

                // Skip header rows or invalid name rows
                if (!nameVal || nameVal.toLowerCase().includes('name of the elector') || nameVal.toLowerCase().includes('sino')) {
                    continue;
                }

                // Lookup Polling Station details from masterPollingMap
                const pollingInfo = masterPollingMap[currentPartNo] || {
                    polling_station_name: currentPartNo ? `Polling Station for Part ${currentPartNo}` : null,
                    polling_address: currentPartNo ? `Tumkur District, Karnataka` : null
                };

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
                    part_number: currentPartNo || null,
                    polling_station_name: pollingInfo.polling_station_name,
                    polling_address: pollingInfo.polling_address,
                    photo_url: null
                });
                fileRecordCount++;
            }
        }
        totalProcessedFiles++;
        console.log(`✓ Processed file [${totalProcessedFiles}/${files.length}]: ${file} -> Extracted ${fileRecordCount} voters`);
    } catch (err) {
        console.error(`❌ Error parsing ${file}:`, err.message);
    }
}

console.log(`\n========================================`);
console.log(`TOTAL UNIQUE VOTER RECORDS PARSED: ${validRecords.length}`);
console.log(`========================================\n`);

async function runIngest() {
    const batchSize = 200;
    let inserted = 0;

    for (let i = 0; i < validRecords.length; i += batchSize) {
        const chunk = validRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('electors').upsert(chunk, { onConflict: 'epic_number' });

        if (error) {
            console.error(`Error ingesting chunk ${i}..${i + batchSize}:`, error.message);
            process.exit(1);
        }
        inserted += chunk.length;
        process.stdout.write(`Ingested ${inserted}/${validRecords.length} records into Supabase...\r`);
    }

    console.log(`\n\n🎉 SUCCESS: All ${validRecords.length} voter records updated with official Polling Station & Address details!`);
    
    // Verify count in database
    const { count, error: countError } = await supabase.from('electors').select('*', { count: 'exact', head: true });
    if (!countError) {
        console.log(`📊 Verified total elector rows in Supabase: ${count}`);
    }
}

runIngest();
