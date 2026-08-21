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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase URL/Key environment variables are missing in Vercel settings.' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(data as Elector);
  } catch (err: any) {
    console.error('API route exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error connecting to Supabase database.' },
      { status: 500 }
    );
  }
}
