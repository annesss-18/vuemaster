// app/(root)/interview/session/[sessionId]/page.tsx (FIXED IMPORT)
import { getInterviewsById } from "@/lib/actions/general.action";
import { redirect } from "next/navigation";
import type { RouteParams } from '@/types';
import DisplayTechIcons from "@/components/DisplayTechIcons";
import CompanyLogo from "@/components/CompanyLogo";
import { LiveInterviewAgent } from "@/components/LiveInterviewAgent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Briefcase, TrendingUp, Sparkles, Clock, Target, AlertCircle } from "lucide-react";
import Link from "next/link";

const Page = async ({ params }: RouteParams) => {
  const user = await getCurrentUser();
  const { sessionId } = await params;

  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/');
  }

  const interview = await getInterviewsById(sessionId, user?.id);

  if (!interview) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fadeIn">
        <div className="card-border">
          <div className="card !p-12 text-center space-y-6">
            <div className="size-24 rounded-full bg-destructive-100/10 border-2 border-destructive-100/30 flex items-center justify-center mx-auto">
              <AlertCircle className="size-12 text-destructive-100" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-light-100">Interview Session Not Found</h2>
              <p className="text-light-300">The interview session you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
            </div>
            <Link
              href="/interview"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Sparkles className="size-5" />
              <span>Create New Interview</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!interview.questions || interview.questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fadeIn">
        <div className="card-border">
          <div className="card !p-12 text-center space-y-6">
            <div className="size-24 rounded-full bg-warning-200/10 border-2 border-warning-200/30 flex items-center justify-center mx-auto">
              <AlertCircle className="size-12 text-warning-200" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-light-100">Interview Data Incomplete</h2>
              <p className="text-light-300">This interview session is missing required data. Please create a new interview.</p>
            </div>
            <Link
              href="/interview"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Sparkles className="size-5" />
              <span>Create New Interview</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section with Interview Details */}
      <div className="card-border animate-slideInLeft">
        <div className="card !p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-1">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CompanyLogo
                  companyName={interview.companyName || 'Unknown Company'}
                  size={80}
                  className="relative rounded-full size-20 ring-4 ring-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-400/50"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md w-fit">
                    <Sparkles className="size-3 text-primary-300 animate-pulse" />
                    <span className="text-xs font-semibold text-primary-200">Live Interview</span>
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                    {interview.role} Interview
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Briefcase className="size-4 text-primary-300" />
                    <span className="text-sm font-medium text-light-200 capitalize">{interview.level || 'All Levels'}</span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Target className="size-4 text-accent-300" />
                    <span className="text-sm font-medium text-light-200 capitalize">{interview.type}</span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Clock className="size-4 text-info-100" />
                    <span className="text-sm font-medium text-light-200">~30 minutes</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-light-300">Technologies:</span>
                  <DisplayTechIcons techStack={interview.techstack || []} />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 rounded-2xl backdrop-blur-md bg-gradient-to-r from-primary-500/20 to-accent-300/20 border border-primary-400/30">
              <p className="text-lg font-bold text-primary-200 capitalize">{interview.type} Session</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="card-border animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
        <div className="card !p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-info-100/20 border border-info-100/30 flex items-center justify-center shrink-0">
              <TrendingUp className="size-6 text-info-100" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-light-100">Interview Guidelines</h3>
              <ul className="space-y-2 text-sm text-light-300">
                <li className="flex items-start gap-2">
                  <span className="text-primary-300 font-bold">•</span>
                  <span>Find a quiet environment and ensure your microphone is working properly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-300 font-bold">•</span>
                  <span>Speak clearly and take your time to formulate thoughtful responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-300 font-bold">•</span>
                  <span>The AI interviewer will ask follow-up questions based on your answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-300 font-bold">•</span>
                  <span>You&apos;ll receive detailed feedback immediately after completing the interview</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interview Agent Component */}
      <LiveInterviewAgent
        interview={interview}
        sessionId={sessionId}
        userId={user?.id || ''}
      />
    </div>
  );
}

export default Page;