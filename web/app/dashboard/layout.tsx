import LogoutButton from '@/components/LogoutButton';
import LiveRecordBadge from '@/components/LiveRecordBadge';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ShieldCheck } from 'lucide-react';

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

      {/* Discreet Compact Watermark Footer */}
      <footer className="relative border-t border-slate-800/80 bg-slate-900 text-slate-400 py-2 sm:py-2.5 text-[10px] sm:text-[11px] overflow-hidden">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-indigo-500/50 via-violet-400/50 to-purple-500/50 opacity-75" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-1.5 text-center sm:text-left">
          {/* Left Watermark Statement */}
          <div className="flex items-center gap-1.5 font-medium tracking-tight text-slate-400 justify-center sm:justify-start">
            <span>© 2026</span>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent font-bold">
              LALITH D &amp; MOHIT J GUJJAR
            </span>
            <span className="opacity-60">• All Rights Reserved</span>
          </div>

          {/* Right Excellence Tagline */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-[9px] sm:text-[10px] text-slate-400 mx-auto sm:mx-0">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>Designed &amp; Developed with Excellence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
