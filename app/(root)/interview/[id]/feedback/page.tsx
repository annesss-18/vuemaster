import { getCurrentUser } from '@/lib/actions/auth.action';
import { getFeedbackByInterviewId, getInterviewsById } from '@/lib/actions/general.action';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react'

const page = async ({ params }: RouteParams) => {

    const { id } = await params;

    // Guard: ensure route param exists
    if (!id || typeof id !== 'string') {
        redirect('/');
    }

    const user = await getCurrentUser();
    if (!user) {
        // Require authentication to view feedback
        redirect('/sign-in');
    }

    const interview = await getInterviewsById(id, user.id);
    if (!interview) redirect('/');

    const feedback = await getFeedbackByInterviewId({
        interviewId: id,
        userId: user.id
    });


    logger.info('FEEDBACK:', feedback);

    if (!feedback) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <h2 className="text-2xl font-semibold">Feedback</h2>
                <p className="mt-4 text-muted-foreground">No feedback available for this interview yet.</p>
                <Link href={`/interview/${id}`} className="btn-primary mt-4 inline-block">
                    Take Interview
                </Link>
            </div>
        );
    }

    //typed category items
    type CategoryItem = { name: string; score: number; comment: string };

    const formatDate = (iso?: string) => {
        if (!iso) return 'N/A';

        const date = new Date(iso);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }

        return date.toLocaleString();
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Interview Feedback</h1>
                    <p className="text-sm text-muted-foreground">Interview ID: {feedback.interviewId}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium">{formatDate(feedback.createdAt)}</div>
                </div>
            </header>

            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground">Total score</div>
                        <div className="text-3xl font-bold mt-1">{feedback.totalScore}%</div>
                    </div>
                    <div className="w-2/3 ml-6">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-4 overflow-hidden">
                            <div className="h-4 bg-emerald-500" style={{ width: `${feedback.totalScore}%` }} />
                        </div>
                        <div className="text-sm text-muted-foreground mt-2">Overall performance based on category scores</div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Array.isArray(feedback.categoryScoresArray) && feedback.categoryScoresArray.map((cat: CategoryItem) => (
                    <article key={cat.name} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{cat.name}</h3>
                            <div className="text-lg font-bold">{cat.score}%</div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden mb-3">
                            <div className="h-2 bg-amber-500" style={{ width: `${cat.score}%` }} />
                        </div>
                        <p className="text-sm text-muted-foreground">{cat.comment}</p>
                    </article>
                ))}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
                    <h4 className="font-semibold mb-3">Strengths</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {Array.isArray(feedback.strengths) && feedback.strengths.map((s: string, i: number) => (
                            <li key={i} className="mb-1">{s}</li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
                    <h4 className="font-semibold mb-3">Areas for improvement</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {Array.isArray(feedback.areasForImprovement) && feedback.areasForImprovement.map((a: string, i: number) => (
                            <li key={i} className="mb-1">{a}</li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
                <h4 className="font-semibold mb-3">Final assessment</h4>
                <p className="text-sm text-muted-foreground">{feedback.finalAssessment}</p>
            </section>
        </div>
    )
}

export default page
