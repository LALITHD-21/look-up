import LogoutButton from '@/components/LogoutButton';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-gray-200/60 shadow-soft">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 sm:gap-3 text-gray-900 hover:text-indigo-600 transition group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-200">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight block leading-tight">
                Elector Lookup
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-gray-400 tracking-widest block">
                Internal Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <LogoutButton />
          </div>
        </div>

        {/* Subtle accent gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-80" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-5 bg-white/50 text-center">
        <p className="text-xs text-gray-400 font-medium tracking-wide">
          Elector Lookup Portal&ensp;•&ensp;Internal Private System&ensp;•&ensp;RLS Protected
        </p>
      </footer>
    </div>
  );
}
