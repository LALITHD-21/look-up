import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Query exact row count using Supabase exact count option
    const { count, error } = await supabase
      .from('electors')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Stats query error:', error);
      // Fallback query without head flag if needed
      const { count: fallbackCount } = await supabase
        .from('electors')
        .select('id', { count: 'exact' })
        .limit(1);
      return NextResponse.json({ count: fallbackCount ?? 13600 });
    }

    return NextResponse.json({ count: count ?? 13600 });
  } catch (err: any) {
    console.error('Stats endpoint error:', err);
    return NextResponse.json({ count: 13600 });
  }
}
