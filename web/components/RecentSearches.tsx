'use client';

import React, { useState, useEffect } from 'react';
import { SearchHistoryItem, getSearchHistory, clearSearchHistory } from '@/lib/searchHistory';
import { History, Trash2, ArrowUpRight, Clock } from 'lucide-react';
import { formatEpicForDisplay } from '@/lib/utils';

interface RecentSearchesProps {
  onSelectEpic: (epic: string) => void;
  refreshTrigger?: number;
}

export default function RecentSearches({ onSelectEpic, refreshTrigger = 0 }: RecentSearchesProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [refreshTrigger]);

  const handleClearAll = () => {
    clearSearchHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-2.5 pt-2 animate-fadeIn">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Recent Searches</span>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-red-600 transition"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {history.map((item) => (
          <button
            key={item.epic}
            type="button"
            onClick={() => onSelectEpic(item.epic)}
            className="group inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white hover:bg-indigo-50/80 border border-gray-200/80 hover:border-indigo-200/80 shadow-sm text-[11px] sm:text-xs font-medium transition-all duration-200 active:scale-95"
          >
            <span className="epic-mono font-bold text-gray-900 group-hover:text-indigo-700">
              {formatEpicForDisplay(item.epic)}
            </span>
            {item.name && (
              <span className="text-gray-500 font-normal truncate max-w-[90px] sm:max-w-[120px]">
                • {item.name}
              </span>
            )}
            <ArrowUpRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
}
