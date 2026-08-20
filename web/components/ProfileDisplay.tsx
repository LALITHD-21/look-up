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
import { ArrowLeft, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import { getElectorByEpic, primeElectorCache } from '@/lib/electorService';
import { formatEpicForDisplay } from '@/lib/utils';

interface ProfileDisplayProps {
  elector: Elector;
  onSearchNew?: (epic: string) => void;
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

  // Real-time fast in-place lookup for subsequent searches
  const handleFastSearch = async (epic: string) => {
    setIsSearching(true);
    setSearchError(null);
    setCurrentEpic(epic);

    const { elector, error } = await getElectorByEpic(epic);
    setIsSearching(false);

    if (error) {
      setSearchError(error);
      setCurrentElector(null);
    } else {
      setCurrentElector(elector);
      // Synchronize browser URL smoothly without full server reload
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/profile/${encodeURIComponent(epic)}`);
      }
    }
  };

  // Copy full voter profile summary to clipboard
  const handleCopyDetails = () => {
    if (!currentElector) return;

    const summary = [
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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Top action bar: back link & instant search input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 no-print">
        {showBackToDashboard ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          <div />
        )}

        {/* Quick Instant Realtime Search Input */}
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

      {/* Loading state during in-place search */}
      {isSearching && (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3 shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-600">Retrieving elector record...</p>
        </div>
      )}

      {/* Main Content when not actively searching */}
      {!isSearching && (
        <>
          {/* Found Elector View */}
          {currentElector ? (
            <div className="space-y-6">
              {/* Control Header with Profile summary & View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-sm no-print">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                      Current Profile
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {currentElector.name}
                      </span>
                      <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-semibold">
                        {formatEpicForDisplay(currentElector.epic_number)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  {/* Copy Details Button */}
                  <button
                    onClick={handleCopyDetails}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {/* Card / Table Toggle */}
                  <ViewToggle view={view} onChange={setView} />
                </div>
              </div>

              {/* Main Display: Card View or Table View */}
              <div className="pt-1">
                {view === 'card' ? (
                  <ProfileCard elector={currentElector} />
                ) : (
                  <ProfileTable elector={currentElector} />
                )}
              </div>
            </div>
          ) : (
            /* Not Found / Empty State */
            <EmptyState epic={currentEpic} />
          )}
        </>
      )}
    </div>
  );
}
