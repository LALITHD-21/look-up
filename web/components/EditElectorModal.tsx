'use client';

import React, { useState, useEffect } from 'react';
import { Elector } from '@/lib/types';
import { updateElectorRecord } from '@/lib/electorService';
import {
  X,
  User,
  Users,
  Calendar,
  UserCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  Building2,
  Hash,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { formatEpicForDisplay } from '@/lib/utils';

interface EditElectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  elector: Elector;
  onSaveSuccess: (updatedElector: Elector) => void;
}

interface FormDataState {
  name?: string;
  relative_name?: string | null;
  age?: string | number | null;
  sex?: 'M' | 'F' | 'O' | null;
  address?: string | null;
  qualification?: string | null;
  occupation?: string | null;
  serial_number?: string | number | null;
  part_number?: string | null;
  polling_station_name?: string | null;
  polling_address?: string | null;
}

export default function EditElectorModal({
  isOpen,
  onClose,
  elector,
  onSaveSuccess,
}: EditElectorModalProps) {
  const [formData, setFormData] = useState<FormDataState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (elector) {
      setFormData({
        name: elector.name || '',
        relative_name: elector.relative_name || '',
        age: elector.age !== null && elector.age !== undefined ? elector.age : '',
        sex: elector.sex || null,
        address: elector.address || '',
        qualification: elector.qualification || '',
        occupation: elector.occupation || '',
        serial_number: elector.serial_number !== null && elector.serial_number !== undefined ? elector.serial_number : '',
        part_number: elector.part_number || '',
        polling_station_name: elector.polling_station_name || '',
        polling_address: elector.polling_address || '',
      });
      setError(null);
      setSuccessMessage(null);
    }
  }, [elector, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setError('Name field is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: Partial<Elector> = {
      name: formData.name.trim(),
      relative_name: formData.relative_name ? String(formData.relative_name).trim() : null,
      age: formData.age !== '' && formData.age !== null && formData.age !== undefined ? Number(formData.age) : null,
      sex: (formData.sex === 'M' || formData.sex === 'F') ? formData.sex : null,
      address: formData.address ? String(formData.address).trim() : null,
      qualification: formData.qualification ? String(formData.qualification).trim() : null,
      occupation: formData.occupation ? String(formData.occupation).trim() : null,
      serial_number: formData.serial_number !== '' && formData.serial_number !== null && formData.serial_number !== undefined ? Number(formData.serial_number) : null,
      part_number: formData.part_number ? String(formData.part_number).trim() : null,
      polling_station_name: formData.polling_station_name ? String(formData.polling_station_name).trim() : null,
      polling_address: formData.polling_address ? String(formData.polling_address).trim() : null,
    };

    const { elector: updated, error: updateError } = await updateElectorRecord(
      elector.epic_number,
      payload
    );

    setIsSaving(false);

    if (updateError) {
      setError(updateError);
    } else if (updated) {
      setSuccessMessage('Record updated permanently in database!');
      setTimeout(() => {
        onSaveSuccess(updated);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-soft-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                Edit Elector Record
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                EPIC: <span className="epic-mono text-indigo-600 font-bold">{formatEpicForDisplay(elector.epic_number)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition active:scale-95 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Personal Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              1. Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                  placeholder="Enter elector full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Relative Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Father / Husband Name</span>
                </label>
                <input
                  type="text"
                  name="relative_name"
                  value={formData.relative_name || ''}
                  onChange={handleChange}
                  placeholder="Relative name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Age (Years)</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age !== undefined && formData.age !== null ? formData.age : ''}
                  onChange={handleChange}
                  min={18}
                  max={120}
                  placeholder="Age"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Sex / Gender */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gender</span>
                </label>
                <select
                  name="sex"
                  value={formData.sex || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Education & Occupation */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              2. Qualification & Occupation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Qualification */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Qualification</span>
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification || ''}
                  onChange={handleChange}
                  placeholder="e.g. Graduate, SSC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Occupation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Occupation</span>
                </label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation || ''}
                  onChange={handleChange}
                  placeholder="e.g. Engineer, Business"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ordinary Residence */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              3. Ordinary Residence
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Address / Residence</span>
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="House No, Street, Village/Town"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Section 4: Polling Station Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              4. Polling Station & Serial Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Part Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Part Number</span>
                </label>
                <input
                  type="text"
                  name="part_number"
                  value={formData.part_number || ''}
                  onChange={handleChange}
                  placeholder="e.g. 142"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Serial Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Serial Number</span>
                </label>
                <input
                  type="number"
                  name="serial_number"
                  value={formData.serial_number !== undefined && formData.serial_number !== null ? formData.serial_number : ''}
                  onChange={handleChange}
                  placeholder="e.g. 450"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Polling Station Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Polling Station Name</span>
                </label>
                <input
                  type="text"
                  name="polling_station_name"
                  value={formData.polling_station_name || ''}
                  onChange={handleChange}
                  placeholder="Station building or school name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              {/* Polling Address / Coverage Area */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Polling Station Coverage Area</span>
                </label>
                <textarea
                  name="polling_address"
                  rows={2}
                  value={formData.polling_address || ''}
                  onChange={handleChange}
                  placeholder="Polling coverage area / street list"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
