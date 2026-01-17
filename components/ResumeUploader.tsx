'use client';

import { useState, useCallback, useRef } from 'react';
import { FileUp, FileCheck, X, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ResumeUploaderProps {
    onResumeUploaded: (text: string) => void;
    onResumeClear: () => void;
    initialResumeText?: string;
}

interface UploadState {
    status: 'idle' | 'uploading' | 'success' | 'error';
    fileName?: string;
    error?: string;
    textPreview?: string;
}

export function ResumeUploader({ onResumeUploaded, onResumeClear, initialResumeText }: ResumeUploaderProps) {
    const [uploadState, setUploadState] = useState<UploadState>(() => {
        if (initialResumeText) {
            return {
                status: 'success',
                fileName: 'Previously uploaded resume',
                textPreview: initialResumeText.slice(0, 200),
            };
        }
        return { status: 'idle' };
    });
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        // Validate file type
        if (file.type !== 'application/pdf') {
            setUploadState({
                status: 'error',
                error: 'Please upload a PDF file',
            });
            toast.error('Please upload a PDF file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadState({
                status: 'error',
                error: 'File size must be under 5MB',
            });
            toast.error('File size must be under 5MB');
            return;
        }

        setUploadState({
            status: 'uploading',
            fileName: file.name,
        });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/resume/parse', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse resume');
            }

            setUploadState({
                status: 'success',
                fileName: file.name,
                textPreview: data.text.slice(0, 200),
            });

            onResumeUploaded(data.text);
            toast.success('Resume uploaded successfully!');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to upload resume';
            setUploadState({
                status: 'error',
                fileName: file.name,
                error: errorMessage,
            });
            toast.error(errorMessage);
        }
    }, [onResumeUploaded]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0]) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && files[0]) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    const handleClear = useCallback(() => {
        setUploadState({ status: 'idle' });
        onResumeClear();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onResumeClear]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Idle state - show upload zone
    if (uploadState.status === 'idle') {
        return (
            <div className="w-full max-w-md">
                <div
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative cursor-pointer rounded-2xl border-2 border-dashed p-6
                        transition-all duration-300 group
                        ${isDragOver
                            ? 'border-primary-400 bg-primary-500/10 scale-[1.02]'
                            : 'border-light-400/30 bg-dark-200/40 hover:border-primary-400/50 hover:bg-dark-200/60'
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className={`
                            size-14 rounded-xl flex items-center justify-center
                            transition-all duration-300
                            ${isDragOver
                                ? 'bg-primary-500/30 border-2 border-primary-400'
                                : 'bg-dark-300/60 border border-light-400/20 group-hover:bg-primary-500/20 group-hover:border-primary-400/40'
                            }
                        `}>
                            <FileUp className={`size-7 transition-colors ${isDragOver ? 'text-primary-300' : 'text-light-400 group-hover:text-primary-300'}`} />
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium text-light-200">
                                {isDragOver ? 'Drop your resume here' : 'Upload your resume'}
                            </p>
                            <p className="text-xs text-light-400">
                                PDF file, max 5MB (optional)
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mt-2 text-xs text-light-400 text-center">
                    Your resume helps the AI personalize interview questions
                </p>
            </div>
        );
    }

    // Uploading state
    if (uploadState.status === 'uploading') {
        return (
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-primary-400/30 bg-primary-500/10 p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary-500/20 border border-primary-400/40 flex items-center justify-center">
                            <Loader2 className="size-6 text-primary-300 animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-light-200 truncate">
                                {uploadState.fileName}
                            </p>
                            <p className="text-xs text-light-400">
                                Parsing resume...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (uploadState.status === 'error') {
        return (
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-destructive-100/30 bg-destructive-100/10 p-6">
                    <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-destructive-100/20 border border-destructive-100/40 flex items-center justify-center shrink-0">
                            <AlertCircle className="size-6 text-destructive-100" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-light-200">
                                Upload failed
                            </p>
                            <p className="text-xs text-destructive-100 mt-1">
                                {uploadState.error}
                            </p>
                        </div>
                        <button
                            onClick={handleClear}
                            className="p-2 rounded-lg hover:bg-dark-200/60 transition-colors"
                        >
                            <X className="size-4 text-light-400" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    return (
        <div className="w-full max-w-md">
            <div className="rounded-2xl border border-success-100/30 bg-success-100/10 p-6">
                <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-success-100/20 border border-success-100/40 flex items-center justify-center shrink-0">
                        <FileCheck className="size-6 text-success-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-light-200 truncate">
                            {uploadState.fileName}
                        </p>
                        <p className="text-xs text-success-100 mt-1">
                            Resume uploaded successfully
                        </p>
                        {uploadState.textPreview && (
                            <div className="mt-3 p-3 rounded-lg bg-dark-200/60 border border-light-400/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="size-3 text-light-400" />
                                    <span className="text-xs text-light-400">Preview</span>
                                </div>
                                <p className="text-xs text-light-300 line-clamp-3">
                                    {uploadState.textPreview}...
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleClear}
                        className="p-2 rounded-lg hover:bg-dark-200/60 transition-colors"
                        title="Remove resume"
                    >
                        <X className="size-4 text-light-400 hover:text-light-200" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ResumeUploader;
