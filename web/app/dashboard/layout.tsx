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

      {/* Professional Executive Watermark Footer */}
      <footer className="relative border-t border-slate-800/80 bg-slate-900 text-slate-300 py-6 overflow-hidden">
        {/* Top Glowing Gradient Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-400 to-purple-500 opacity-90" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Left / Center Watermark Statement */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide text-slate-100 flex-wrap justify-center md:justify-start">
            <span className="text-slate-400 font-normal">© 2026</span>
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400 bg-clip-text text-transparent font-extrabold text-sm sm:text-base">
              LALITH D &amp; MOHIT J GUJJAR
            </span>
            <span className="text-slate-400 font-medium">• All Rights Reserved.</span>
          </div>

          {/* Right Excellence Tagline */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-semibold text-indigo-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Designed &amp; Developed with Excellence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
