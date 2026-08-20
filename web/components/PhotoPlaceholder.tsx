'use client';

import React from 'react';
import { getInitials } from '@/lib/utils';

interface PhotoPlaceholderProps {
  name: string;
  epic?: string;
  className?: string;
}

/**
 * PhotoPlaceholder Component
 * 
 * Always shown instead of an elector photo because the photo feature is ⚠️ PENDING.
 * Displays a clean rounded circle with the elector's initials or a fallback.
 */
export default function PhotoPlaceholder({
  name,
  epic = '',
  className = '',
}: PhotoPlaceholderProps) {
  const initials = name ? getInitials(name) : (epic ? epic.slice(0, 2).toUpperCase() : '?');

  return (
    <div
      aria-label={`Photo placeholder for ${name || epic}`}
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100/50 text-indigo-600 font-extrabold shadow-inner-soft select-none ${className}`}
    >
      <span className="tracking-wider">{initials}</span>
    </div>
  );
}
