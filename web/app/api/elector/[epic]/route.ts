import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { Elector } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { epic: string } }
) {
  const rawEpic = params.epic || '';
  const epic = rawEpic.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!epic) {
    return NextResponse.json({ error: 'EPIC number is required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('electors')
      .select('*')
      .eq('epic_number', epic)
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(data as Elector);
  } catch (err: any) {
    console.error('API route exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
