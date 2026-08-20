'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess?: () => void;
}

interface UploadReport {
    fileName: string;
    totalRawRows: number;
    validRecords: number;
    upsertedRecords: number;
    droppedRecords: number;
    durationMs: number;
}

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess }: FileUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [report, setReport] = useState<UploadReport | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setUploadError(null);
            setReport(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['xlsx', 'xls', 'csv', 'pdf'].includes(ext || '')) {
                setSelectedFile(file);
                setUploadError(null);
                setReport(null);
            } else {
                setUploadError('Please select a valid .xlsx, .xls, .csv, or .pdf file.');
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadError(null);
        setReport(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            setIsUploading(false);

            if (!res.ok) {
                setUploadError(data.error || 'Failed to upload and process file.');
            } else {
                setReport(data);
                if (onUploadSuccess) onUploadSuccess();
            }
        } catch (err: any) {
            setIsUploading(false);
            setUploadError(err.message || 'An unexpected error occurred during upload.');
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setUploadError(null);
        setReport(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden transition-all transform scale-100 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-gray-900">Upload Voter Dataset</h3>
                            <p className="text-[10px] sm:text-xs text-gray-500">Supported formats: .xlsx, .xls, .csv, .pdf</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                    {/* Drag and Drop Zone */}
                    {!report && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                                    : selectedFile
                                    ? 'border-indigo-200 bg-indigo-50/20'
                                    : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile ? (
                                <div className="space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                                        {selectedFile.name.endsWith('.pdf') ? (
                                            <FileText className="w-6 h-6" />
                                        ) : (
                                            <FileSpreadsheet className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 truncate max-w-xs mx-auto">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReset();
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                                    >
                                        Choose a different file
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            Click to browse or drag & drop file
                                        </p>
                                        <p className="text-xs text-gray-400">Excel spreadsheets (.xlsx, .xls, .csv) or PDF documents</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Banner */}
                    {uploadError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs leading-relaxed">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Ingestion Report Summary */}
                    {report && (
                        <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-4 animate-fadeIn">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span>Dataset Ingested Successfully!</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-white rounded-lg border border-emerald-100">
                                    <p className="text-gray-500">File Name</p>
                                    <p className="font-semibold text-gray-900 truncate mt-0.5">{report.fileName}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-emerald-100">
                                    <p className="text-gray-500">Database Upserts</p>
                                    <p className="font-bold text-emerald-600 text-base mt-0.5">{report.upsertedRecords}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-emerald-100">
                                    <p className="text-gray-500">Raw Rows Read</p>
                                    <p className="font-semibold text-gray-900 mt-0.5">{report.totalRawRows}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-emerald-100">
                                    <p className="text-gray-500">Dropped / Invalid</p>
                                    <p className="font-semibold text-gray-600 mt-0.5">{report.droppedRecords}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-emerald-700 pt-1 font-mono">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Processed in {report.durationMs}ms</span>
                                </span>
                                <span>Idempotent Upsert</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    {report ? (
                        <>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition inline-flex items-center gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Upload Another</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
                            >
                                Done
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isUploading}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition inline-flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Parsing & Ingesting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        <span>Upload & Ingest</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
