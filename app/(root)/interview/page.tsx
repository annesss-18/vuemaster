// app/(root)/interview/page.tsx
import React from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getInterviewsByUserId, getLatestInterviews, getFeedbackByInterviewId } from '@/lib/actions/general.action'
import { Sparkles, Plus } from 'lucide-react'
import InterviewTabs from '@/components/InterviewTabs'

const Page = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [userSessions, allTemplates] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id })
  ]);

  // NEW: Fetch feedback for each session
  // This is required because InterviewCard is no longer async
  const sessionsWithFeedback = await Promise.all(
    (userSessions || []).map(async (session) => {
      const feedback = await getFeedbackByInterviewId({ interviewId: session.id, userId: user.id });
      return { ...session, feedback };
    })
  );

  return (
    <div className="container-app">
      <section className="mb-12 animate-fadeIn">
        <div className="card-border">
          <div className="card !p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md w-fit">
                  <Sparkles className="size-4 text-primary-300 animate-pulse" />
                  <span className="text-sm font-semibold text-primary-200">Interview Dashboard</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Welcome back, <span className="bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">{user.name}</span>
                </h1>

                <p className="text-lg text-light-300 max-w-2xl">
                  Manage your interview sessions and explore new interview templates
                </p>
              </div>

              <Link href="/create" className="btn-primary text-lg px-8 py-4 group">
                <Plus className="size-6" />
                <span className="font-bold">Create Interview</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pass the enriched sessions list */}
      <InterviewTabs
        userSessions={sessionsWithFeedback}
        allTemplates={allTemplates || []}
        userId={user.id}
      />
    </div>
  )
}

export default Page;