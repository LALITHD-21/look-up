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

    return NextResponse.json(data as Elector, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('API route exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error connecting to Supabase database.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { epic: string } }
) {
  const rawEpic = params.epic || '';
  const epic = rawEpic.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!epic) {
    return NextResponse.json({ error: 'EPIC number is required' }, { status: 400 });
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    const allowedFields = [
      'name',
      'relative_name',
      'address',
      'qualification',
      'occupation',
      'age',
      'sex',
      'part_number',
      'polling_station_name',
      'polling_address',
      'serial_number',
    ];

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'age' || field === 'serial_number') {
          const val = body[field];
          updatePayload[field] = val === '' || val === null ? null : Number(val);
        } else if (field === 'sex') {
          const val = body[field];
          updatePayload[field] = val === 'M' || val === 'F' ? val : null;
        } else {
          const val = body[field];
          updatePayload[field] = typeof val === 'string' ? val.trim() || null : val;
        }
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('electors')
      .update(updatePayload)
      .eq('epic_number', epic)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: `Database update error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(data as Elector, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('PATCH route exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error updating record.' },
      { status: 500 }
    );
  }
}

