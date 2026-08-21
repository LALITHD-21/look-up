'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Elector } from '@/lib/types';
import ViewToggle from './ViewToggle';
import ProfileCard from './ProfileCard';
import ProfileTable from './ProfileTable';
import SearchBar from './SearchBar';
import EmptyState from './EmptyState';
import { ArrowLeft, Copy, Check, Loader2, Sparkles, Printer } from 'lucide-react';
import { getElectorByEpic, primeElectorCache } from '@/lib/electorService';
import { formatEpicForDisplay } from '@/lib/utils';
import { saveSearchHistoryItem } from '@/lib/searchHistory';

interface ProfileDisplayProps {
  elector: Elector;
  showBackToDashboard?: boolean;
}

export default function ProfileDisplay({
  elector: initialElector,
  showBackToDashboard = true,
}: ProfileDisplayProps) {
  const router = useRouter();
  const [currentElector, setCurrentElector] = useState<Elector | null>(initialElector);
  const [currentEpic, setCurrentEpic] = useState<string>(initialElector.epic_number);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [copied, setCopied] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Prime cache with the initially loaded elector
  useEffect(() => {
    if (initialElector?.epic_number) {
      primeElectorCache(initialElector.epic_number, initialElector);
      setCurrentElector(initialElector);
      setCurrentEpic(initialElector.epic_number);
    }
  }, [initialElector]);

  // Real-time fast in-place lookup for quick search
  const handleFastSearch = async (epic: string) => {
    setIsSearching(true);
    setSearchError(null);
    setCurrentEpic(epic);

    const { elector, error } = await getElectorByEpic(epic);
    setIsSearching(false);

    if (error) {
      setSearchError(error);
      setCurrentElector(null);
      saveSearchHistoryItem(epic);
    } else if (elector) {
      setCurrentElector(elector);
      saveSearchHistoryItem(epic, elector.name);
      // Synchronize browser URL smoothly
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/profile/${encodeURIComponent(epic)}`);
      }
    }
  };

  const handleCopyDetails = () => {
    if (!currentElector) return;

    const summary = [
      `--- ELECTOR DETAILS SLIP ---`,
      `EPIC Number: ${formatEpicForDisplay(currentElector.epic_number)}`,
      `Name: ${currentElector.name}`,
      currentElector.relative_name ? `Relative: ${currentElector.relative_name}` : null,
      currentElector.age ? `Age: ${currentElector.age}` : null,
      currentElector.sex ? `Sex: ${currentElector.sex}` : null,
      currentElector.address ? `Address: ${currentElector.address}` : null,
      currentElector.qualification ? `Qualification: ${currentElector.qualification}` : null,
      currentElector.occupation ? `Occupation: ${currentElector.occupation}` : null,
      currentElector.serial_number ? `Serial No: ${currentElector.serial_number}` : null,
      currentElector.part_number ? `Part Number: ${currentElector.part_number}` : null,
      currentElector.polling_station_name ? `Polling Station: ${currentElector.polling_station_name}` : null,
      currentElector.polling_address ? `Polling Address: ${currentElector.polling_address}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fadeIn">
      {/* Action Bar Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1 no-print">
        {showBackToDashboard ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200/80 shadow-xs hover:bg-slate-50 hover:text-indigo-600 transition active:scale-95 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Search</span>
          </Link>
        ) : (
          <div />
        )}

        {/* Quick Instant Search Input */}
        <div className="w-full sm:w-80">
          <SearchBar
            initialValue={currentEpic}
            autoFocus={false}
            size="compact"
            showCharCounter={false}
            placeholder="Quick search new EPIC..."
            onSearch={handleFastSearch}
            isLoading={isSearching}
          />
        </div>
      </div>

      {/* Loading state */}
      {isSearching && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-soft-xl animate-scaleIn">
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin relative" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Retrieving elector profile...</p>
        </div>
      )}

      {/* Main Content */}
      {!isSearching && (
        <>
          {currentElector ? (
            <div className="space-y-5">
              {/* Profile Bar Control Ribbon */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs no-print">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                      Active Elector Profile
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                        {currentElector.name}
                      </span>
                      <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-100 font-bold">
                        {formatEpicForDisplay(currentElector.epic_number)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                  {/* View Mode Toggle */}
                  <ViewToggle view={view} onChange={setView} />
                </div>
              </div>

              {/* View Output */}
              <div className="pt-1">
                {view === 'card' ? (
                  <ProfileCard elector={currentElector} />
                ) : (
                  <ProfileTable elector={currentElector} />
                )}
              </div>
            </div>
          ) : (
            <EmptyState epic={currentEpic} />
          )}
        </>
      )}
    </div>
  );
}
