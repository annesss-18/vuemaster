import { FileUp, Upload, Loader2 } from 'lucide-react';
import { useResumeUpload } from '@/components/hooks/useResumeUpload';

interface ResumeUploadCardProps {
    interviewId?: string;
    onUploadSuccess?: (resumeText: string) => void;
}

export default function ResumeUploadCard({ interviewId, onUploadSuccess }: ResumeUploadCardProps) {
    const { file, isUploading, handleFileSelect, uploadResume } = useResumeUpload({
        interviewId,
        onUploadSuccess
    });

    return (
        <div className="card-border animate-fadeIn">
            <div className="card !p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <FileUp className="size-5 text-primary-300" />
                            <h4 className="font-semibold text-light-100">Optional: Upload Your Resume</h4>
                        </div>
                        <p className="text-sm text-light-400">
                            Enhance your interview experience by uploading your resume. The AI will tailor questions based on your background.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <label className="btn-upload bg-dark-200/60 min-h-12 cursor-pointer transition-all duration-300 hover:border-primary-400/50">
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                                onChange={handleFileSelect}
                            />
                            <FileUp className="size-5 text-primary-300 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-sm font-medium text-light-200 truncate max-w-[200px]">
                                {file ? file.name : 'Choose File'}
                            </span>
                        </label>

                        <button
                            onClick={uploadResume}
                            className="btn-secondary !px-6 !py-3 !min-h-12"
                            disabled={!file || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="size-4" />
                                    <span>Upload</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}