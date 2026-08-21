'use client';

import React from 'react';
import { getInitials } from '@/lib/utils';
import { UserCheck } from 'lucide-react';

interface PhotoPlaceholderProps {
  name: string;
  epic?: string;
  className?: string;
}

/**
 * PhotoPlaceholder Component
 * 
 * Elegant avatar component for Elector profiles.
 * Features dual-tone gradient background, initials typography, and status indicator.
 */
export default function PhotoPlaceholder({
  name,
  epic = '',
  className = 'w-24 h-24 sm:w-28 sm:h-28 text-2xl sm:text-3xl',
}: PhotoPlaceholderProps) {
  const initials = name ? getInitials(name) : (epic ? epic.slice(0, 2).toUpperCase() : '?');

  return (
    <div className="relative inline-block select-none group">
      {/* Outer Glow Ring */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-violet-500/20 to-purple-500/20 blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
      
      {/* Main Avatar Container */}
      <div
        aria-label={`Avatar placeholder for ${name || epic}`}
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white font-extrabold shadow-lg shadow-indigo-500/25 border-2 border-white/90 overflow-hidden ${className}`}
      >
        {/* Subtle SVG Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        
        {/* Initials Text */}
        <span className="relative z-10 tracking-wider drop-shadow-sm font-sans">
          {initials}
        </span>

        {/* Glossy Overlay Highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Verified Elector Status Badge Pill */}
      <div
        title="Verified Elector Record"
        className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-md shadow-emerald-500/30 flex items-center justify-center"
      >
        <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </div>
    </div>
  );
}
