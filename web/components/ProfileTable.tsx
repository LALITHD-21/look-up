'use client';

import React from 'react';
import { Elector } from '@/lib/types';
import { formatEpicForDisplay } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface ProfileTableProps {
  elector: Elector;
}

export default function ProfileTable({ elector }: ProfileTableProps) {
  const mainRows = [
    { label: 'EPIC Number', value: elector.epic_number, formatted: formatEpicForDisplay(elector.epic_number), isMono: true },
    { label: 'Serial Number', value: elector.serial_number?.toString() || '—' },
    { label: 'Full Name', value: elector.name },
    { label: 'Relative Name', value: elector.relative_name || '—' },
    { label: 'Sex', value: elector.sex === 'M' ? 'Male (M)' : elector.sex === 'F' ? 'Female (F)' : (elector.sex || '—') },
    { label: 'Age', value: elector.age ? `${elector.age} years` : '—' },
    { label: 'Address', value: elector.address || '—' },
    { label: 'Qualification', value: elector.qualification || '—' },
    { label: 'Occupation', value: elector.occupation || '—' },
  ];

  const pollingRows = [
    { label: 'Part Number', value: elector.part_number || '—', isMono: true },
    { label: 'Polling Station', value: elector.polling_station_name || '—' },
    { label: 'Polling Address', value: elector.polling_address || '—' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-scaleIn">
      <div className="flex justify-end no-print">
        <button
          onClick={handlePrint}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 active:scale-95"
        >
          <Printer className="w-4 h-4 text-gray-500" />
          <span>Print Table</span>
        </button>
      </div>

      <div className="printable-table bg-white rounded-2xl border border-gray-200/60 shadow-soft overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[300px]">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-slate-50/80 border-b border-gray-200">
              <th className="py-3 px-3 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 w-28 sm:w-44">
                Field
              </th>
              <th className="py-3 px-3 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Main elector rows */}
            {mainRows.map((row, index) => (
              <tr
                key={index}
                className={`border-b border-gray-50 transition-colors duration-150 ${
                  index % 2 === 0
                    ? 'bg-white hover:bg-indigo-50/30'
                    : 'bg-gray-50/30 hover:bg-indigo-50/30'
                }`}
              >
                <td className="py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-500 align-top">
                  {row.label}
                </td>
                <td
                  className={`py-3 px-3 sm:px-6 text-xs sm:text-sm text-gray-900 leading-relaxed ${
                    row.isMono ? 'epic-mono font-bold text-indigo-700' : 'font-medium'
                  }`}
                >
                  {row.formatted || row.value}
                </td>
              </tr>
            ))}

            {/* Polling Station separator row */}
            <tr className="bg-gradient-to-r from-violet-50/60 to-indigo-50/40 border-y border-gray-200/60">
              <td
                colSpan={2}
                className="py-2.5 px-3 sm:px-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-violet-600"
              >
                Polling Station
              </td>
            </tr>

            {/* Polling data rows */}
            {pollingRows.map((row, index) => (
              <tr
                key={`polling-${index}`}
                className={`border-b border-gray-50 transition-colors duration-150 ${
                  index % 2 === 0
                    ? 'bg-white hover:bg-violet-50/30'
                    : 'bg-gray-50/30 hover:bg-violet-50/30'
                }`}
              >
                <td className="py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-500 align-top">
                  {row.label}
                </td>
                <td className={`py-3 px-3 sm:px-6 text-xs sm:text-sm text-gray-900 leading-relaxed ${row.isMono ? 'epic-mono font-bold' : 'font-medium'}`}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
