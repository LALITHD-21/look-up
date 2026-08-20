import { NextResponse } from 'next/server';
import electorsData from '@/data/electors.json';
import { Elector } from '@/lib/types';

// Fast Map index for ultra-instant O(1) EPIC lookups across all 13,600 electors
const electorsMap = new Map<string, Elector>();

(electorsData as Elector[]).forEach((e) => {
  if (e && e.epic_number) {
    const cleanKey = e.epic_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    electorsMap.set(cleanKey, e);
  }
});

export async function GET(
  request: Request,
  { params }: { params: { epic: string } }
) {
  const rawEpic = params.epic || '';
  const epic = rawEpic.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!epic) {
    return NextResponse.json({ error: 'EPIC number is required' }, { status: 400 });
  }

  // 1. Direct O(1) Map lookup
  const found = electorsMap.get(epic);
  if (found) {
    return NextResponse.json(found);
  }

  // 2. Secondary fallback match using Array.from
  const entries = Array.from(electorsMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, record] = entries[i];
    if (key.includes(epic) || epic.includes(key)) {
      return NextResponse.json(record);
    }
  }

  return NextResponse.json(null, { status: 404 });
}
