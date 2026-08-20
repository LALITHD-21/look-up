'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, User, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const rawInput = identifier.trim();
    if (!rawInput || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    // Map plain username (e.g. 'admin') to the internal account email
    const emailToUse = rawInput.includes('@')
      ? rawInput
      : `${rawInput.toLowerCase()}@electorportal.com`;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: rawInput, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid username or password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success: hard navigation to dashboard clears router cache and triggers middleware
      window.location.href = redirectPath;
    } catch (err: any) {
      setError('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-scaleIn">
      {/* Card with glassmorphism */}
      <div className="glass-strong rounded-2xl shadow-elevated border border-white/60 p-6 sm:p-10 space-y-5 sm:space-y-7">

        {/* Logo & Brand */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 mb-1">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              Elector Lookup Portal
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Sign in with authorized credentials
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 text-sm text-red-700 bg-red-50/80 border border-red-200/60 rounded-xl animate-slideDown"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {/* Username Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700"
            >
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition">
                <User className="w-[18px] h-[18px]" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                placeholder="e.g. admin"
                className="w-full pl-11 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition">
                <Lock className="w-[18px] h-[18px]" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-indigo-600 transition"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Quick Fill Demo Accounts */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block text-center">
            Authorized Accounts (Click to autofill)
          </span>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => { setIdentifier('admin'); setPassword('AdminPassword123!'); setError(null); }}
              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg transition active:scale-95"
            >
              admin
            </button>
            <button
              type="button"
              onClick={() => { setIdentifier('operator'); setPassword('OperatorPassword123!'); setError(null); }}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-lg transition active:scale-95"
            >
              operator
            </button>
            <button
              type="button"
              onClick={() => { setIdentifier('supervisor'); setPassword('SupervisorPassword123!'); setError(null); }}
              className="px-2.5 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/60 rounded-lg transition active:scale-95"
            >
              supervisor
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-gray-400" />
            <span>Private internal system • Contact administrator for access</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/60" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-indigo-200/20 via-violet-200/20 to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-indigo-100/30 via-purple-100/20 to-transparent blur-3xl" />

      {/* Decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10">
        <Suspense fallback={
          <div className="w-full max-w-md glass-strong rounded-2xl shadow-elevated p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading portal...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
