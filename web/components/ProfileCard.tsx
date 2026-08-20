'use client';

import React from 'react';
import { Elector } from '@/lib/types';
import { formatEpicForDisplay } from '@/lib/utils';
import PhotoPlaceholder from './PhotoPlaceholder';
import { MapPin, Briefcase, GraduationCap, Users, Building2 } from 'lucide-react';

interface ProfileCardProps {
  elector: Elector;
}

export default function ProfileCard({ elector }: ProfileCardProps) {
  const formattedEpic = formatEpicForDisplay(elector.epic_number);

  const hasPollingData =
    elector.part_number || elector.polling_station_name || elector.polling_address;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200/60 shadow-soft overflow-hidden transition-all duration-300 hover:shadow-elevated animate-scaleIn">
      {/* Header bar with gradient */}
      <div className="relative bg-gradient-to-r from-indigo-50 via-white to-violet-50/40 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100/80 flex flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-indigo-200/50">
            EPIC
          </span>
          <span className="epic-mono text-base sm:text-lg font-bold text-gray-900">
            {formattedEpic}
          </span>
        </div>
        {elector.serial_number && (
          <div className="text-[11px] sm:text-xs text-gray-500 font-medium bg-gray-50 px-2 sm:px-2.5 py-1 rounded-md border border-gray-100">
            Serial <span className="text-gray-800 font-bold">{elector.serial_number}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
          {/* Photo Placeholder (Always shown - photo feature is PENDING) */}
          <div className="flex-shrink-0">
            <PhotoPlaceholder
              name={elector.name}
              epic={elector.epic_number}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-xl sm:text-2xl md:text-3xl"
            />
          </div>

          {/* Primary Info */}
          <div className="flex-1 text-center md:text-left space-y-2.5 sm:space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {elector.name}
              </h1>
              {elector.relative_name && (
                <p className="text-sm sm:text-base text-gray-600 mt-1 flex items-center justify-center md:justify-start gap-2">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{elector.relative_name}</span>
                </p>
              )}
            </div>

            {/* Badges for Quick Metrics */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              {elector.age !== null && (
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-800 border border-gray-200/70 shadow-sm">
                  Age: <strong className="ml-1 text-gray-900">{elector.age} yrs</strong>
                </span>
              )}
              {elector.sex && (
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-800 border border-gray-200/70 shadow-sm">
                  Sex: <strong className="ml-1 text-gray-900">{elector.sex === 'M' ? 'Male' : elector.sex === 'F' ? 'Female' : elector.sex}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-4 sm:my-6 border-gray-100" />

        {/* Detailed Info Grid */}
        <div className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-3 bg-gradient-to-r from-gray-50/80 to-slate-50/40 p-3.5 sm:p-4 rounded-xl border border-gray-100/80">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Ordinary Residence / Address
              </span>
              <p className="text-xs sm:text-sm font-medium text-gray-900 leading-relaxed break-words">
                {elector.address || 'Address not recorded'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Qualification */}
            <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-gray-50/50 rounded-xl border border-gray-100/70">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100/60 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Qualification</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 block">
                  {elector.qualification || '—'}
                </span>
              </div>
            </div>

            {/* Occupation */}
            <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-gray-50/50 rounded-xl border border-gray-100/70">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100/60 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Occupation</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 block">
                  {elector.occupation || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Polling Station Section — only if at least one field is non-null */}
        {hasPollingData && (
          <>
            <hr className="my-4 sm:my-6 border-gray-100" />

            <div className="space-y-3">
              {/* Group label */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100/60 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Polling Station
                </span>
              </div>

              {/* Polling details */}
              <div className="bg-gradient-to-r from-violet-50/40 to-indigo-50/30 p-3.5 sm:p-4 rounded-xl border border-violet-100/50 space-y-3">
                {/* Part Number */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 w-full sm:w-32 flex-shrink-0">Part Number</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 epic-mono">
                    {elector.part_number || '—'}
                  </span>
                </div>

                {/* Station Name */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 w-full sm:w-32 flex-shrink-0">Station</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 leading-relaxed">
                    {elector.polling_station_name || '—'}
                  </span>
                </div>

                {/* Polling Address */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 w-full sm:w-32 flex-shrink-0 pt-0.5">Address</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">
                    {elector.polling_address || '—'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
