import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface ElectorInputRecord {
    serial_number?: number | null;
    epic_number: string;
    name: string;
    relative_name?: string | null;
    address?: string | null;
    qualification?: string | null;
    occupation?: string | null;
    age?: number | null;
    sex?: 'M' | 'F' | null;
    photo_url?: string | null;
}

// Canonical column mapping helper
function canonicalizeKey(key: string): string {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k.includes('epic') || k.includes('voterid') || k.includes('idnumber')) return 'epic_number';
    if (k.includes('relative') || k.includes('father') || k.includes('husband') || k.includes('relation')) return 'relative_name';
    if (k.includes('name') && !k.includes('relative') && !k.includes('father') && !k.includes('mother')) return 'name';
    if (k.includes('address') || k.includes('house') || k.includes('loc') || k.includes('residence')) return 'address';
    if (k.includes('qualification') || k.includes('education')) return 'qualification';
    if (k.includes('occupation') || k.includes('occupcation') || k.includes('job') || k.includes('work')) return 'occupation';
    if (k.includes('age')) return 'age';
    if (k.includes('sex') || k.includes('gender')) return 'sex';
    if (k.includes('serial') || k.includes('slno') || k.includes('srno') || k.includes('sno')) return 'serial_number';
    return key;
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Log in required' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = file.name;
        const ext = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();

        let rawRows: Record<string, any>[] = [];

        if (['xlsx', 'xls', 'csv'].includes(ext)) {
            // Parse spreadsheet
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        } else if (ext === 'pdf') {
            // Import pdf-parse PDFParse class constructor
            const pdfParseModule = require('pdf-parse');
            const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule;
            const parser = new PDFParseClass({ data: buffer });
            const pdfResult = await parser.getText();
            const fullText = typeof pdfResult === 'string' ? pdfResult : (pdfResult?.text || '');

            // Split into lines or double-newline blocks
            const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

            // Group lines by EPIC numbers found
            const epicRegex = /([A-Z]{3}\d{7})/gi;

            let currentEntry: Record<string, any> | null = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = epicRegex.exec(line);
                epicRegex.lastIndex = 0; // reset regex index

                if (match) {
                    const epic = match[1].toUpperCase();

                    // Parse line for fields: e.g. "1  A N Naveen Kumar  K Narasimha Murthy ... M  32  YNT3665783"
                    const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);

                    let slNo: number | null = null;
                    let ageVal: number | null = null;
                    let sexVal: 'M' | 'F' | null = null;

                    // Extract Sex (M/F)
                    if (/\bM\b/i.test(line)) sexVal = 'M';
                    else if (/\bF\b/i.test(line)) sexVal = 'F';

                    // Extract Age
                    const ageMatch = line.match(/\b(1[89]|[2-9]\d|1[01]\d)\b/);
                    if (ageMatch) ageVal = parseInt(ageMatch[1], 10);

                    // Extract Serial number if line starts with a number
                    const slMatch = line.match(/^\d+/);
                    if (slMatch) slNo = parseInt(slMatch[0], 10);

                    // Extract Name and Relative Name from parts if available
                    let nameVal = '';
                    let relativeVal = '';
                    let addressVal = '';

                    if (parts.length >= 3) {
                        nameVal = parts[1] || parts[0];
                        relativeVal = parts[2] || '';
                        if (parts.length >= 4) addressVal = parts[3];
                    } else {
                        // Fallback: cleanup line text
                        const cleanedLine = line.replace(/([A-Z]{3}\d{7})/gi, '').replace(/\bPhoto Available\b/gi, '').trim();
                        nameVal = cleanedLine || `Elector (${epic})`;
                    }

                    rawRows.push({
                        epic_number: epic,
                        name: nameVal || `Elector (${epic})`,
                        relative_name: relativeVal,
                        address: addressVal,
                        age: ageVal,
                        sex: sexVal,
                        serial_number: slNo
                    });
                }
            }

            // Fallback if no line-structured rows matched: extract all unique EPICs directly
            if (rawRows.length === 0) {
                const matches = Array.from(fullText.matchAll(/([A-Z]{3}\d{7})/gi));
                const uniqueEpics = Array.from(new Set(matches.map(m => m[1].toUpperCase())));
                rawRows = uniqueEpics.map((epic, idx) => ({
                    epic_number: epic,
                    name: `Elector Record (${epic})`,
                    serial_number: idx + 1
                }));
            }
        } else {
            return NextResponse.json(
                { error: 'Unsupported file format. Please upload .xlsx, .xls, .csv, or .pdf files.' },
                { status: 400 }
            );
        }

        if (!rawRows || rawRows.length === 0) {
            return NextResponse.json({ error: 'Uploaded file contains no readable data rows or valid EPIC numbers.' }, { status: 400 });
        }

        // Clean & Validate Records
        const validRecords: ElectorInputRecord[] = [];
        let droppedCount = 0;
        const seenEpics = new Set<string>();

        for (const row of rawRows) {
            // Re-key object keys
            const cleanedObj: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
                cleanedObj[canonicalizeKey(k)] = v;
            }

            const rawEpic = String(cleanedObj.epic_number || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const epicValid = /^[A-Z]{3}\d{7}$/.test(rawEpic);

            if (!epicValid || seenEpics.has(rawEpic)) {
                droppedCount++;
                continue;
            }

            const rawName = String(cleanedObj.name || '').trim().replace(/\s+/g, ' ');
            if (!rawName) {
                droppedCount++;
                continue;
            }

            seenEpics.add(rawEpic);

            // Parse optional fields
            let ageNum: number | null = null;
            if (cleanedObj.age) {
                const parsedAge = parseInt(String(cleanedObj.age), 10);
                if (!isNaN(parsedAge) && parsedAge >= 18 && parsedAge <= 120) {
                    ageNum = parsedAge;
                }
            }

            let sexVal: 'M' | 'F' | null = null;
            if (cleanedObj.sex) {
                const s = String(cleanedObj.sex).trim().toUpperCase();
                if (s.startsWith('M')) sexVal = 'M';
                else if (s.startsWith('F')) sexVal = 'F';
            }

            let slNo: number | null = null;
            if (cleanedObj.serial_number) {
                const parsedSl = parseInt(String(cleanedObj.serial_number), 10);
                if (!isNaN(parsedSl)) slNo = parsedSl;
            }

            validRecords.push({
                epic_number: rawEpic,
                name: rawName,
                relative_name: cleanedObj.relative_name ? String(cleanedObj.relative_name).trim() : null,
                address: cleanedObj.address ? String(cleanedObj.address).trim() : null,
                qualification: cleanedObj.qualification ? String(cleanedObj.qualification).trim() : null,
                occupation: cleanedObj.occupation ? String(cleanedObj.occupation).trim() : null,
                age: ageNum,
                sex: sexVal,
                serial_number: slNo,
                photo_url: null
            });
        }

        if (validRecords.length === 0) {
            return NextResponse.json(
                { error: 'No valid EPIC records found in file. Ensure EPIC numbers match format: 3 letters + 7 digits.' },
                { status: 400 }
            );
        }

        // Upsert to Supabase in batches of 100
        const batchSize = 100;
        let upsertedCount = 0;

        for (let i = 0; i < validRecords.length; i += batchSize) {
            const chunk = validRecords.slice(i, i + batchSize);
            const { error: upsertError } = await supabase
                .from('electors')
                .upsert(chunk, { onConflict: 'epic_number' });

            if (upsertError) {
                return NextResponse.json(
                    { error: `Database Ingestion Error: ${upsertError.message}` },
                    { status: 500 }
                );
            }
            upsertedCount += chunk.length;
        }

        const durationMs = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            fileName: fileName,
            totalRawRows: rawRows.length,
            validRecords: validRecords.length,
            upsertedRecords: upsertedCount,
            droppedRecords: droppedCount,
            durationMs: durationMs
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error processing file' }, { status: 500 });
    }
}
