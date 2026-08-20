'use client';

import React, { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import ProfileDisplay from '@/components/ProfileDisplay';
import EmptyState from '@/components/EmptyState';
import FileUploadModal from '@/components/FileUploadModal';
import RecentSearches from '@/components/RecentSearches';
import { ShieldCheck, Database, Zap, Sparkles, Loader2, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { getElectorByEpic } from '@/lib/electorService';
import { saveSearchHistoryItem } from '@/lib/searchHistory';
import { Elector } from '@/lib/types';

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
      // Save to search history even if missing record
      saveSearchHistoryItem(epic);
      setHistoryTrigger(prev => prev + 1);
    } else {
      setElector(result.elector);
      // Save to search history with voter name
      if (result.elector) {
        saveSearchHistoryItem(epic, result.elector.name);
        setHistoryTrigger(prev => prev + 1);
      }
      // Synchronize URL in browser without full page reload
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
        {/* Hero Section */}
        <div className="text-center space-y-3.5 sm:space-y-5 animate-fadeIn">
          {/* Status & Action Badges */}
          <div className="inline-flex items-center justify-center gap-2 flex-wrap px-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-100/80 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Secure Real-Time Lookup</span>
            </div>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Elector Lookup
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-gray-500 max-w-lg mx-auto font-medium px-2">
              Enter any 10-digit EPIC number for instant voter profile retrieval
            </p>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="space-y-3 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <SearchBar
            initialValue={activeEpic}
            autoFocus={true}
            onSearch={handleInstantSearch}
            onClear={handleClear}
            isLoading={isSearching}
          />

          {/* Format hint & performance indicator */}
          <div className="flex items-center justify-between max-w-xl mx-auto px-1 text-xs text-gray-400">
            <span className="font-medium">
              Format: <strong className="text-gray-600 epic-mono">ABC1234567</strong>
            </span>
            {hasSearched && lookupDuration !== null && (
              <span className="text-indigo-600 font-semibold flex items-center gap-1 animate-fadeIn">
                <Sparkles className="w-3 h-3" />
                <span className="epic-mono text-[11px]">
                  {fromCache ? '0ms (cached)' : `${lookupDuration}ms`}
                </span>
              </span>
            )}
          </div>

          {/* Recent Search History Pills */}
          <RecentSearches
            onSelectEpic={handleInstantSearch}
            refreshTrigger={historyTrigger}
          />
        </div>

        {/* Loading Spinner during search */}
        {isSearching && (
          <div className="bg-white/80 p-10 rounded-2xl border border-gray-200/60 text-center space-y-3 shadow-soft max-w-2xl mx-auto animate-scaleIn backdrop-blur-sm">
            <div className="relative inline-flex">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin relative" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              Scanning database for <span className="epic-mono font-bold text-indigo-600">{activeEpic}</span>
            </p>
          </div>
        )}

        {/* Display Live Results */}
        {!isSearching && hasSearched && (
          <div className="animate-fadeInUp">
            {elector ? (
              <ProfileDisplay elector={elector} showBackToDashboard={false} />
            ) : searchError ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-red-200/60 text-center space-y-4 shadow-soft animate-scaleIn">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm text-red-600 font-semibold">{searchError}</p>
                <button
                  onClick={() => handleInstantSearch(activeEpic)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Lookup</span>
                </button>
              </div>
            ) : (
              <EmptyState epic={activeEpic} />
            )}
          </div>
        )}

        {/* Feature Cards (shown when idle) */}
        {!hasSearched && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 stagger-children">
            <div className="card-hover group p-5 rounded-2xl bg-white border border-gray-100 shadow-soft space-y-2.5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/60 text-amber-600 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Instant Auto-Scan</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                B-Tree indexed queries with in-memory caching deliver results in milliseconds.
              </p>
            </div>

            <div className="card-hover group p-5 rounded-2xl bg-white border border-gray-100 shadow-soft space-y-2.5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100/60 text-blue-600 group-hover:scale-110 transition-transform duration-200">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Dual Views & Print</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Toggle between rich card view and clean printable table with a single click.
              </p>
            </div>

            <div className="card-hover group p-5 rounded-2xl bg-white border border-gray-100 shadow-soft space-y-2.5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100/60 text-emerald-600 group-hover:scale-110 transition-transform duration-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">RLS Protected</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Database-level Row Level Security ensures every query is authorized.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
