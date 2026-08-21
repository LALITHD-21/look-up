'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess?: () => void;
}

interface UploadReport {
    fileName: string;
    fileFormat?: string;
    sheetsParsed?: number;
    totalRawRows: number;
    validRecords: number;
    upsertedRecords: number;
    duplicateRecords?: number;
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

    const validateAndSetFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['xlsx', 'xls', 'csv', 'pdf'].includes(ext || '')) {
            setSelectedFile(file);
            setUploadError(null);
            setReport(null);
        } else {
            setSelectedFile(null);
            setUploadError('Invalid file format. Please select an Excel spreadsheet (.xlsx, .xls, .csv) or PDF document (.pdf).');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
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
            validateAndSetFile(e.dataTransfer.files[0]);
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
                setUploadError(data.error || 'Failed to upload and process dataset.');
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
                            <p className="text-[10px] sm:text-xs text-gray-500">Formats: Excel (.xlsx, .xls, .csv) & PDF (.pdf)</p>
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
                    {/* Format Badges & Instructions */}
                    {!report && (
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-gray-500 font-medium">Supported File Formats:</span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    .XLSX / .XLS
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                    .CSV
                                </span>
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                    .PDF
                                </span>
                            </div>
                        </div>
                    )}

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
                                            <FileText className="w-6 h-6 text-rose-600" />
                                        ) : (
                                            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-xs mx-auto">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split('.').pop()?.toUpperCase()} Document
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
                                    <Upload className="w-10 h-10 text-indigo-400 mx-auto" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            Click to browse or drag & drop file
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Excel spreadsheets (.xlsx, .xls, .csv) or PDF documents (.pdf)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Banner */}
                    {uploadError && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs leading-relaxed">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Ingestion Report Summary */}
                    {report && (
                        <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <span>Dataset Processed & Ingested!</span>
                                </div>
                                {report.fileFormat && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        {report.fileFormat} FORMAT
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs">
                                    <p className="text-gray-500 text-[11px]">Unique Voters Ingested</p>
                                    <p className="font-extrabold text-emerald-600 text-lg mt-0.5">{report.upsertedRecords.toLocaleString()}</p>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs">
                                    <p className="text-gray-500 text-[11px]">Sheets Processed</p>
                                    <p className="font-bold text-gray-900 text-base mt-0.5 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{report.sheetsParsed || 1} {report.sheetsParsed === 1 ? 'Sheet' : 'Sheets'}</span>
                                    </p>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs">
                                    <p className="text-gray-500 text-[11px]">Duplicates Handled</p>
                                    <p className="font-bold text-indigo-600 text-sm mt-0.5 flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{report.duplicateRecords || 0} Merged</span>
                                    </p>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs">
                                    <p className="text-gray-500 text-[11px]">Raw Rows Scanned</p>
                                    <p className="font-semibold text-gray-900 mt-0.5">{report.totalRawRows.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-emerald-700 pt-1 font-mono text-[11px]">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Processed in {report.durationMs}ms</span>
                                </span>
                                <span className="font-bold">Idempotent Deduplication</span>
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
