'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, X, Save, ArrowRight } from 'lucide-react';

interface DraftData {
    role: string;
    companyName?: string;
    techStack: string[];
    questions: string[];
    jobDescription: string;
    level: string;
    type: string;
}

interface InterviewEditorProps {
    initialDraft: DraftData;
}

const InterviewEditor: React.FC<InterviewEditorProps> = ({ initialDraft }) => {
    const router = useRouter();
    const [draft, setDraft] = useState<DraftData>(initialDraft);
    const [isSaving, setIsSaving] = useState(false);
    const [newTech, setNewTech] = useState('');

    const handleUpdate = (field: keyof DraftData, value: any) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const handleQuestionChange = (index: number, val: string) => {
        const newQuestions = [...draft.questions];
        newQuestions[index] = val;
        handleUpdate('questions', newQuestions);
    };

    const deleteQuestion = (index: number) => {
        const newQuestions = draft.questions.filter((_, i) => i !== index);
        handleUpdate('questions', newQuestions);
    };

    const addQuestion = () => {
        handleUpdate('questions', [...draft.questions, "New Question"]);
    };

    const removeTech = (techToRemove: string) => {
        handleUpdate('techStack', draft.techStack.filter(t => t !== techToRemove));
    };

    const addTech = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTech.trim()) {
            e.preventDefault();
            if (!draft.techStack.includes(newTech.trim())) {
                handleUpdate('techStack', [...draft.techStack, newTech.trim()]);
            }
            setNewTech('');
        }
    };

    const handleSave = async () => {
        if (!draft.role || draft.questions.length === 0) {
            toast.error('Please ensure Role and Questions are filled.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create Template
            const res = await fetch('/api/interview/template/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const { templateId } = data;

            toast.success('Interview Template Created!');
            // Redirect to Template Landing Page
            router.push(`/interview/template/${templateId}`);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to create interview");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="card !p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                        Customize Interview
                    </h2>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary"
                    >
                        {isSaving ? <Loader2 className="animate-spin size-4 mr-2" /> : <Save className="size-4 mr-2" />}
                        Save & Start
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-light-300">Role</label>
                        <input
                            type="text"
                            value={draft.role}
                            onChange={(e) => handleUpdate('role', e.target.value)}
                            className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-light-100 placeholder:text-light-400 focus:outline-none focus:border-primary-400/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-light-300">Company (Optional)</label>
                        <input
                            type="text"
                            value={draft.companyName || ''}
                            onChange={(e) => handleUpdate('companyName', e.target.value)}
                            className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-light-100 placeholder:text-light-400 focus:outline-none focus:border-primary-400/50 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-light-300">Tech Stack</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {draft.techStack.map(tech => (
                            <span key={tech} className="bg-primary-500/20 text-primary-200 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                {tech}
                                <button onClick={() => removeTech(tech)} className="hover:text-destructive-300"><X className="size-3" /></button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={newTech}
                        onChange={(e) => setNewTech(e.target.value)}
                        onKeyDown={addTech}
                        placeholder="Type and press Enter to add..."
                        className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-light-100 placeholder:text-light-400 focus:outline-none focus:border-primary-400/50 transition-all"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-lg font-semibold text-light-100">Questions</label>
                        <button onClick={addQuestion} className="text-sm text-primary-300 hover:text-primary-200 flex items-center gap-1">
                            <Plus className="size-4" /> Add Question
                        </button>
                    </div>
                    <div className="space-y-3">
                        {draft.questions.map((q, idx) => (
                            <div key={idx} className="flex gap-2 items-start group">
                                <span className="text-light-400 mt-3 text-sm font-mono">{idx + 1}.</span>
                                <textarea
                                    value={q}
                                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                                    rows={2}
                                    className="flex-1 bg-dark-300/50 border border-light-400/10 rounded-lg p-3 text-light-200 text-sm focus:outline-none focus:border-primary-400/30 transition-all resize-none"
                                />
                                <button onClick={() => deleteQuestion(idx)} className="mt-3 text-light-400 hover:text-destructive-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewEditor;
