import LogoutButton from '@/components/LogoutButton';
import LiveRecordBadge from '@/components/LiveRecordBadge';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Executive Glass Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-22 flex items-center justify-between gap-4">
          {/* Prominent Large Logo Link */}
          <Link
            href="/dashboard"
            className="flex items-center group transition-transform duration-200 hover:scale-[1.02] flex-shrink-0"
          >
            <div className="relative h-12 sm:h-14 md:h-16 w-64 sm:w-80 md:w-96 flex items-center">
              <Image
                src="/logo-horizontal.png"
                alt="ELECTROL-LOQKUP - Election Commission of India"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          {/* Right Header Status & Logout */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Real-time Live Database Index Status Badge */}
            <LiveRecordBadge />

            <LogoutButton />
          </div>
        </div>

        {/* Accent Gradient Line at Top Header */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-90" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-5 bg-white/60 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>ELECTROL-LOQKUP • Internal Electoral System • RLS Enforced</span>
          </p>
          <p className="text-[11px] font-semibold text-slate-400">
            Strictly Confidential & Authorized Access Only
          </p>
        </div>
      </footer>
    </div>
  );
}
