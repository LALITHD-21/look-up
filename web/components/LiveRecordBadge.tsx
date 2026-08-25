'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';

export default function LiveRecordBadge() {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLiveCount = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === 'number') {
          setCount(data.count);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live electors count', e);
    } finally {
      setIsLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchLiveCount();
    // Auto-refresh live count every 5 seconds with updated DB record count
    const interval = setInterval(fetchLiveCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayCount = count !== null ? count.toLocaleString('en-IN') : '...';

  return (
    <div
      onClick={() => fetchLiveCount(true)}
      title="Click to refresh live record count from database"
      className="inline-flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 border border-slate-200/90 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer group animate-fadeIn flex-shrink-0"
    >
      {/* Dual Radar Pulsing Beacon */}
      <div className="relative flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-xs" />
      </div>

      {/* Database Icon & Live Counter */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold tracking-wide">
        <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 group-hover:scale-110 transition-transform flex-shrink-0" />
        <span className="epic-mono font-extrabold text-slate-900 text-xs sm:text-sm">
          {isLoading ? '...' : displayCount}
        </span>
        <span className="text-slate-600 font-extrabold uppercase text-[10px] sm:text-[11px] tracking-wider whitespace-nowrap">
          Indexed
        </span>
      </div>

      {/* Manual Refresh Spinner */}
      <RefreshCw
        className={`w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition flex-shrink-0 ${
          isRefreshing ? 'animate-spin text-indigo-600' : ''
        }`}
      />
    </div>
  );
}
