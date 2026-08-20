'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Hard navigation to /login clears client state and Next.js router cache
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Log out of application"
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 bg-transparent hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 active:scale-95"
    >
      {isLoggingOut ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
    </button>
  );
}
