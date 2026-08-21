'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import SearchBar from '@/components/SearchBar';
import ProfileDisplay from '@/components/ProfileDisplay';
import EmptyState from '@/components/EmptyState';
import FileUploadModal from '@/components/FileUploadModal';
import RecentSearches from '@/components/RecentSearches';
import {
  ShieldCheck,
  Database,
  Zap,
  Sparkles,
  Loader2,
  RefreshCw,
  Upload,
  Search,
  AlertCircle
} from 'lucide-react';
import { getElectorByEpic, prefetchElectorByEpic } from '@/lib/electorService';
import { saveSearchHistoryItem } from '@/lib/searchHistory';
import { Elector } from '@/lib/types';
import { formatEpicForDisplay } from '@/lib/utils';

export default function DashboardPage() {
  const [activeEpic, setActiveEpic] = useState<string>('');
  const [elector, setElector] = useState<Elector | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lookupDuration, setLookupDuration] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [historyTrigger, setHistoryTrigger] = useState<number>(0);

  const handleInstantSearch = async (epic: string) => {
    setActiveEpic(epic);
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    const result = await getElectorByEpic(epic);
    setIsSearching(false);
    setLookupDuration(result.durationMs);
    setFromCache(result.fromCache);

    if (result.error) {
      setSearchError(result.error);
      setElector(null);
      saveSearchHistoryItem(epic);
      setHistoryTrigger(prev => prev + 1);
    } else {
      setElector(result.elector);
      if (result.elector) {
        saveSearchHistoryItem(epic, result.elector.name);
        setHistoryTrigger(prev => prev + 1);
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/profile/${encodeURIComponent(epic)}`);
      }
    }
  };

  const handleClear = () => {
    setActiveEpic('');
    setElector(null);
    setHasSearched(false);
    setSearchError(null);
    setLookupDuration(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          if (activeEpic) handleInstantSearch(activeEpic);
        }}
      />

      <div className="w-full max-w-4xl space-y-8 py-2 sm:py-4">
        {/* Active Search Result View Header (Compact) */}
        {hasSearched && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-soft-sm">
              <div className="w-full sm:w-auto flex-1">
                <SearchBar
                  initialValue={activeEpic}
                  autoFocus={false}
                  onSearch={handleInstantSearch}
                  onClear={handleClear}
                  isLoading={isSearching}
                  size="compact"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-md transition active:scale-95 flex-shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Dataset</span>
                </button>

                <button
                  onClick={handleClear}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95 flex-shrink-0"
                >
                  New Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner during search */}
        {isSearching && (
          <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center space-y-4 shadow-soft-xl max-w-md mx-auto animate-scaleIn">
            <div className="relative inline-flex">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900">Scanning Database</p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Searching profile for <span className="epic-mono font-bold text-indigo-600">{formatEpicForDisplay(activeEpic)}</span>
              </p>
            </div>
          </div>
        )}

        {/* Display Live Results */}
        {!isSearching && hasSearched && (
          <div className="animate-fadeInUp">
            {elector ? (
              <ProfileDisplay elector={elector} showBackToDashboard={false} />
            ) : (
              searchError ? (
                <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-rose-200/80 text-center space-y-4 shadow-soft-xl animate-scaleIn">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-rose-600 font-bold">{searchError}</p>
                  <button
                    onClick={() => handleInstantSearch(activeEpic)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md transition active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Search</span>
                  </button>
                </div>
              ) : (
                <EmptyState epic={activeEpic} />
              )
            )}
          </div>
        )}

        {/* Landing Hero & Search Form View */}
        {!hasSearched && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Hero Banner Section */}
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              {/* Emblem Logo Badge Header */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-1">
                <Image
                  src="/logo-emblem.png"
                  alt="ELECTROL-LOQKUP Emblem"
                  fill
                  priority
                  className="object-contain drop-shadow-md"
                />
              </div>

              {/* Main Headline */}
              <div className="space-y-2 max-w-2xl mx-auto">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
                    Elector Profile Lookup
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto font-semibold leading-relaxed px-2">
                  Search verified voter records instantly by 10-digit EPIC number
                </p>
              </div>
            </div>

            {/* Search Input Box */}
            <div className="space-y-5">
              <SearchBar
                initialValue={activeEpic}
                autoFocus={true}
                onSearch={handleInstantSearch}
                onClear={handleClear}
                isLoading={isSearching}
              />

              {/* Action Badges - Positioned directly below the Search Bar and made bigger */}
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold text-indigo-700 bg-indigo-50/90 border border-indigo-200/90 shadow-sm transition hover:bg-indigo-100/80">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0" />
                  <span>Secure Real-Time Lookup</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 transition-all duration-200 active:scale-95"
                >
                  <Upload className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>Upload Dataset</span>
                </button>
              </div>

              {/* Recent Search History */}
              <RecentSearches
                onSelectEpic={handleInstantSearch}
                refreshTrigger={historyTrigger}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
