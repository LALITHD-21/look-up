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
  ArrowRight,
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

  const sampleEpics = ['TYA5121967', 'TYA4984829', 'TYA5455795', 'TYA0633792'];

  React.useEffect(() => {
    // Pre-warm in-memory cache for sample EPICs on landing page mount
    sampleEpics.forEach((epic) => prefetchElectorByEpic(epic));
  }, []);

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

      <div className="w-full max-w-4xl space-y-6 sm:space-y-8 py-2 sm:py-4">
        {/* Render Result Screen when user has searched */}
        {hasSearched ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Bar showing lookup metrics & Reset Button */}
            <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Another EPIC</span>
              </button>

              {lookupDuration !== null && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Latency: <strong className="text-indigo-600 epic-mono">{fromCache ? '0ms (cached)' : `${lookupDuration}ms`}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Searching Loader */}
            {isSearching && (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-soft-xl animate-scaleIn">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin relative" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Searching voter database for <span className="epic-mono font-bold text-indigo-600">{formatEpicForDisplay(activeEpic)}</span>
                </p>
              </div>
            )}

            {/* Profile Result Display */}
            {!isSearching && elector && (
              <ProfileDisplay elector={elector} showBackToDashboard={false} />
            )}

            {/* Error or Empty Result */}
            {!isSearching && !elector && (
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
        ) : (
          /* Landing Hero & Search Form View */
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

              {/* Status Badges */}
              <div className="inline-flex items-center justify-center gap-2 flex-wrap px-1">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/80 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Secure Real-Time Lookup</span>
                </div>

                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all duration-200 active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Dataset</span>
                </button>
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
            <div className="space-y-4">
              <SearchBar
                initialValue={activeEpic}
                autoFocus={true}
                onSearch={handleInstantSearch}
                onClear={handleClear}
                isLoading={isSearching}
              />

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
