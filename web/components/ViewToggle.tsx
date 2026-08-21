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
      aria-label="View switch mode"
      className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-xs"
    >
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={view === 'card'}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
          view === 'card'
            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Card View</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
          view === 'table'
            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
        }`}
      >
        <TableProperties className="w-3.5 h-3.5" />
        <span>Table Slip</span>
      </button>
    </div>
  );
}
