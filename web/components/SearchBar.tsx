'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeEpic, isValidEpic } from '@/lib/utils';
import { Search, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';

interface SearchBarProps {
  initialValue?: string;
  autoFocus?: boolean;
  onSearch?: (epic: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  size?: 'large' | 'compact';
  showCharCounter?: boolean;
}

export default function SearchBar({
  initialValue = '',
  autoFocus = true,
  onSearch,
  onClear,
  isLoading: externalLoading = false,
  placeholder = 'Enter EPIC Number (e.g. TYA0633792)',
  size = 'large',
  showCharCounter = true,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchedRef = useRef<string>('');

  const isLoading = externalLoading || internalLoading;

  useEffect(() => {
    if (initialValue !== query) {
      setQuery(normalizeEpic(initialValue));
    }
  }, [initialValue]);

  const executeSearch = useCallback((rawInput: string) => {
    setError(null);
    const normalized = normalizeEpic(rawInput);

    if (!normalized) {
      setError('Please enter an EPIC number to search.');
      return;
    }

    if (!isValidEpic(normalized)) {
      setError('Invalid EPIC format. Expected 3 letters + 7 digits (e.g. TYA0633792).');
      return;
    }

    lastSearchedRef.current = normalized;

    if (onSearch) {
      onSearch(normalized);
    } else {
      setInternalLoading(true);
      router.push(`/profile/${encodeURIComponent(normalized)}`);
    }
  }, [onSearch, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = normalizeEpic(raw);
    
    // Limit to 10 characters maximum
    const trimmed = normalized.slice(0, 10);
    setQuery(trimmed);

    if (error) {
      setError(null);
    }

    // Auto-search trigger: as soon as exactly 10 valid characters are reached
    if (trimmed.length === 10 && isValidEpic(trimmed) && trimmed !== lastSearchedRef.current) {
      executeSearch(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setError(null);
    lastSearchedRef.current = '';
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  const isComplete = query.length === 10;
  const isValid = isValidEpic(query);
  const isCompact = size === 'compact';

  return (
    <div className={`w-full ${isCompact ? 'max-w-md' : 'max-w-xl'} mx-auto`}>
      <form onSubmit={handleSubmit} className="relative space-y-2" noValidate>
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className={isCompact ? 'w-4 h-4' : 'w-4 sm:w-5 h-4 sm:h-5'} />
          </div>

          {/* Main Search Input */}
          <input
            ref={inputRef}
            id="epic-search-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            disabled={isLoading}
            maxLength={10}
            aria-label="EPIC Number search"
            placeholder={placeholder}
            className={`w-full font-mono tracking-wider bg-white border-2 text-gray-900 placeholder-gray-400 placeholder:font-sans focus:outline-none transition ${
              isCompact
                ? 'pl-9 pr-20 py-2 text-xs sm:text-sm rounded-lg shadow-sm'
                : 'pl-10 sm:pl-11 pr-24 sm:pr-28 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg rounded-xl shadow-sm'
            } ${
              isValid
                ? 'border-emerald-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
                : 'border-gray-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
            } disabled:bg-gray-50`}
          />

          {/* Right Action Elements */}
          <div className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center gap-1 sm:gap-1.5">
            {/* Real-time Character Counter / Validity Badge */}
            {showCharCounter && query.length > 0 && (
              <span
                className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full transition ${
                  isValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isComplete
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isValid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Ready</span>
                  </>
                ) : (
                  <span>{query.length}/10</span>
                )}
              </span>
            )}

            {/* Clear Button */}
            {query && !isLoading && (
              <button
                type="button"
                id="clear-search-button"
                onClick={handleClear}
                aria-label="Clear search input"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search / Status Button */}
            <button
              type="submit"
              id="submit-search-button"
              disabled={isLoading || !query}
              className={`inline-flex items-center justify-center font-semibold rounded-lg shadow-sm focus:outline-none transition ${
                isCompact
                  ? 'px-2.5 sm:px-3 py-1.5 text-xs'
                  : 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm'
              } ${
                isValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-2 focus:ring-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
            >
              {isLoading ? (
                <Loader2 className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin`} />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* Inline Error Message */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}
