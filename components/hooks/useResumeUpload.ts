'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface UseResumeUploadProps {
    interviewId?: string;
    onUploadSuccess?: (resumeText: string) => void;
}

export function useResumeUpload({ interviewId, onUploadSuccess }: UseResumeUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [resumeText, setResumeText] = useState<string | null>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            toast.error('Invalid file type. Please upload PDF, DOCX, or TXT.');
            e.target.value = '';
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            toast.error('File too large. Maximum size is 5MB.');
            e.target.value = '';
            return;
        }

        setFile(selectedFile);
        toast.success(`${selectedFile.name} selected - ready to upload`);
    }, []);

    const uploadResume = useCallback(async () => {
        if (!file || !interviewId) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('interviewId', interviewId);
            formData.append('resume', file);

            const response = await fetch('/api/interview/upload-resume', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload resume');
            }

            setResumeText(data.resumeText);
            onUploadSuccess?.(data.resumeText);
            toast.success('Resume uploaded successfully!');

        } catch (error) {
            logger.error('Resume upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    }, [file, interviewId, onUploadSuccess]);

    const clearFile = useCallback(() => {
        setFile(null);
    }, []);

    return {
        file,
        isUploading,
        resumeText,
        handleFileSelect,
        uploadResume,
        clearFile
    };
}