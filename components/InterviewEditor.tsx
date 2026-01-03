'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, X, Save, BrainCircuit, Target } from 'lucide-react';
import { Button } from './ui/button'; // Assuming you have these or use standard buttons

// Match the new Draft Schema
interface DraftData {
    role: string;
    companyName?: string;
    techStack: string[];
    baseQuestions: string[]; // Kept in state but hidden
    jobDescription: string;
    level: string;
    type: string;
    focusArea: string[]; // NEW
}

interface InterviewEditorProps {
    initialDraft: DraftData;
}

const InterviewEditor: React.FC<InterviewEditorProps> = ({ initialDraft }) => {
    const router = useRouter();
    const [draft, setDraft] = useState<DraftData>(initialDraft);
    const [isSaving, setIsSaving] = useState(false);

    // Input states
    const [newTech, setNewTech] = useState('');
    const [newFocus, setNewFocus] = useState('');

    const handleUpdate = (field: keyof DraftData, value: any) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    // Tech Stack Management
    const addTech = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTech.trim()) {
            e.preventDefault();
            if (!draft.techStack.includes(newTech.trim())) {
                handleUpdate('techStack', [...draft.techStack, newTech.trim()]);
            }
            setNewTech('');
        }
    };
    const removeTech = (t: string) => handleUpdate('techStack', draft.techStack.filter(item => item !== t));

    // Focus Area Management
    const addFocus = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newFocus.trim()) {
            e.preventDefault();
            if (!draft.focusArea.includes(newFocus.trim())) {
                handleUpdate('focusArea', [...draft.focusArea, newFocus.trim()]);
            }
            setNewFocus('');
        }
    };
    const removeFocus = (f: string) => handleUpdate('focusArea', draft.focusArea.filter(item => item !== f));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // We save the template (including the hidden questions)
            const res = await fetch('/api/interview/template/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...draft,
                    isPublic: false // Default to private, could add a toggle later
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Interview Template Created!');
            // Redirect to Dashboard (Hub) instead of starting session
            router.push('/dashboard');

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to create interview");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card-border animate-slideInLeft max-w-3xl mx-auto">
            <div className="card !p-8 space-y-8">
                <div className="flex justify-between items-center border-b border-primary-400/20 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Review & Finalize</h2>
                        <p className="text-light-300 text-sm">Verify the AI's analysis before saving.</p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="btn-primary">
                        {isSaving ? <Loader2 className="animate-spin size-4 mr-2" /> : <Save className="size-4 mr-2" />}
                        Save Template
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Role & Company */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-light-200">Target Role</label>
                            <input
                                type="text"
                                value={draft.role}
                                onChange={(e) => handleUpdate('role', e.target.value)}
                                className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-white focus:border-primary-400/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-light-200">Company Context</label>
                            <input
                                type="text"
                                value={draft.companyName || ''}
                                onChange={(e) => handleUpdate('companyName', e.target.value)}
                                placeholder="e.g. Fintech Startup"
                                className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-white focus:border-primary-400/50"
                            />
                        </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-light-200">Key Technologies</label>
                        <div className="flex flex-wrap gap-2">
                            {draft.techStack.map(tech => (
                                <span key={tech} className="bg-primary-500/20 text-primary-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    {tech}
                                    <button onClick={() => removeTech(tech)}><X className="size-3 hover:text-white" /></button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={newTech}
                            onChange={(e) => setNewTech(e.target.value)}
                            onKeyDown={addTech}
                            placeholder="Add tech stack (Press Enter)..."
                            className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-sm text-white"
                        />
                    </div>

                    {/* Focus Areas (Replaces Questions) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Target className="size-4 text-accent-300" />
                            <label className="text-sm font-semibold text-light-200">Focus Competencies</label>
                        </div>
                        <p className="text-xs text-light-400">The AI has identified these key areas to test. Add or remove to adjust the interview scope.</p>

                        <div className="flex flex-wrap gap-2">
                            {draft.focusArea?.map(area => (
                                <span key={area} className="bg-accent-300/10 text-accent-300 border border-accent-300/20 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    {area}
                                    <button onClick={() => removeFocus(area)}><X className="size-3 hover:text-white" /></button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={newFocus}
                            onChange={(e) => setNewFocus(e.target.value)}
                            onKeyDown={addFocus}
                            placeholder="Add a focus area (e.g. System Design)..."
                            className="w-full bg-dark-200/50 border border-primary-400/20 rounded-lg p-3 text-sm text-white"
                        />
                    </div>

                    {/* Hidden Questions Info */}
                    <div className="bg-dark-200/30 p-4 rounded-xl flex items-start gap-3 border border-light-400/10">
                        <BrainCircuit className="size-5 text-light-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-light-200">AI Generated Questions</p>
                            <p className="text-xs text-light-400 mt-1">
                                {draft.baseQuestions.length} rigorous questions have been generated based on the role and focus areas above.
                                They are hidden to simulate a real interview environment.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewEditor;