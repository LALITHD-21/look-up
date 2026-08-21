'use client';

import React, { useState } from 'react';
import { Elector } from '@/lib/types';
import { formatEpicForDisplay } from '@/lib/utils';
import PhotoPlaceholder from './PhotoPlaceholder';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  BadgeCheck,
  Calendar,
  UserCheck
} from 'lucide-react';

interface ProfileCardProps {
  elector: Elector;
}

export default function ProfileCard({ elector }: ProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const formattedEpic = formatEpicForDisplay(elector.epic_number);

  const hasPollingData =
    elector.part_number || elector.polling_station_name || elector.polling_address;

  const handleCopyDetails = () => {
    const summary = [
      `--- ELECTOR DETAILS SLIP ---`,
      `EPIC Number: ${formattedEpic}`,
      `Name: ${elector.name}`,
      elector.relative_name ? `Relative: ${elector.relative_name}` : null,
      elector.age ? `Age: ${elector.age}` : null,
      elector.sex ? `Sex: ${elector.sex === 'M' ? 'Male' : elector.sex === 'F' ? 'Female' : elector.sex}` : null,
      elector.address ? `Address: ${elector.address}` : null,
      elector.qualification ? `Qualification: ${elector.qualification}` : null,
      elector.occupation ? `Occupation: ${elector.occupation}` : null,
      elector.part_number ? `Part Number: ${elector.part_number}` : null,
      elector.polling_station_name ? `Polling Station: ${elector.polling_station_name}` : null,
      elector.polling_address ? `Polling Address: ${elector.polling_address}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-soft-xl overflow-hidden transition-all duration-300 hover:shadow-card-glow animate-scaleIn">
      {/* Top Banner Accent */}
      <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600" />

      {/* Card Header Bar */}
      <div className="bg-slate-50/80 px-5 sm:px-8 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs tracking-wider shadow-sm shadow-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>EPIC</span>
          </div>
          <span className="epic-mono text-lg sm:text-xl font-extrabold text-slate-900 tracking-wider">
            {formattedEpic}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {elector.serial_number && (
            <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              Serial <strong className="text-slate-900 ml-1">#{elector.serial_number}</strong>
            </div>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopyDetails}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 transition active:scale-95 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Slip</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5 sm:p-8 space-y-6">
        {/* Profile Avatar & Primary Info Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar / Photo Placeholder */}
          <div className="flex-shrink-0">
            <PhotoPlaceholder
              name={elector.name}
              epic={elector.epic_number}
              className="w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl"
            />
          </div>

          {/* Name & Primary Attributes */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/80 mb-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Verified Elector</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {elector.name}
              </h1>
              {elector.relative_name && (
                <p className="text-sm sm:text-base text-slate-600 mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-700">{elector.relative_name}</span>
                </p>
              )}
            </div>

            {/* Quick Metrics Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              {elector.age !== null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80 shadow-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Age: <strong className="text-slate-900">{elector.age} yrs</strong></span>
                </span>
              )}
              {elector.sex && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/80 shadow-xs">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Gender: <strong className="text-slate-900">{elector.sex === 'M' ? 'Male' : elector.sex === 'F' ? 'Female' : elector.sex}</strong></span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-100" />

        {/* Details Grid */}
        <div className="space-y-3.5">
          {/* Ordinary Residence Address Block */}
          <div className="flex items-start gap-3.5 bg-slate-50/80 p-4 sm:p-4.5 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-indigo-600 shadow-xs">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Ordinary Residence / Address
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed break-words">
                {elector.address || 'Address not recorded'}
              </p>
            </div>
          </div>

          {/* Qualification & Occupation Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Qualification */}
            <div className="flex items-start gap-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-200/60">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Qualification</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                  {elector.qualification || '—'}
                </span>
              </div>
            </div>

            {/* Occupation */}
            <div className="flex items-start gap-3 p-4 bg-slate-50/60 rounded-2xl border border-slate-200/60">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Occupation</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                  {elector.occupation || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Polling Station Block */}
        {hasPollingData && (
          <>
            <hr className="border-slate-100" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 text-violet-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Polling Station Info
                </span>
              </div>

              <div className="bg-gradient-to-br from-violet-50/50 via-indigo-50/30 to-slate-50/80 p-4 sm:p-5 rounded-2xl border border-violet-100 space-y-3 shadow-xs">
                {/* Part Number */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-full sm:w-28 flex-shrink-0">
                    Part Number
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-indigo-700 epic-mono bg-white px-2.5 py-0.5 rounded-lg border border-indigo-100 inline-block">
                    {elector.part_number || '—'}
                  </span>
                </div>

                {/* Station Name */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-full sm:w-28 flex-shrink-0">
                    Station Name
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                    {elector.polling_station_name || '—'}
                  </span>
                </div>

                {/* Polling Address */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-full sm:w-28 flex-shrink-0 pt-0.5">
                    Coverage Area
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
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
