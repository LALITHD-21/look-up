'use client';

import React from 'react';
import { LayoutGrid, TableProperties } from 'lucide-react';

interface ViewToggleProps {
  view: 'card' | 'table';
  onChange: (view: 'card' | 'table') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View switch"
      className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/60 shadow-inner-soft"
    >
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={view === 'card'}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          view === 'card'
            ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Card</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          view === 'table'
            ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
        }`}
      >
        <TableProperties className="w-4 h-4" />
        <span>Table</span>
      </button>
    </div>
  );
}
