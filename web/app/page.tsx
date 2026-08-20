import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/login');
    }
  } catch (error) {
    // If any issue reading session, redirect to login
    redirect('/login');
  }
}
