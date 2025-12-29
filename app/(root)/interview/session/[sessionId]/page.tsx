import { getInterviewsById } from "@/lib/actions/general.action";
import { getRandomInterviewCover } from "@/lib/utils";
import { redirect } from "next/navigation";
import React from "react";
import Image from "next/image";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Briefcase, TrendingUp, Sparkles, Clock, Target } from "lucide-react";

const Page = async ({ params }: RouteParams) => {
  const user = await getCurrentUser();
  const { sessionId } = await params;

  // Guard: ensure route param exists
  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/');
  }

  const interview = await getInterviewsById(sessionId, user?.id);

  if (!interview) {
    redirect('/');
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section with Interview Details */}
      <div className="card-border animate-slideInLeft">
        <div className="card !p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            {/* Left Side - Interview Info */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-1">
              {/* Avatar with Glow Effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image
                  src={getRandomInterviewCover()}
                  alt="interview-cover"
                  width={80}
                  height={80}
                  className="relative rounded-full object-cover size-20 ring-4 ring-primary-400/30 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary-400/50"
                />
              </div>

              {/* Interview Details */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md w-fit">
                    <Sparkles className="size-3 text-primary-300" />
                    <span className="text-xs font-semibold text-primary-200">Live Interview</span>
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                    {interview?.role} Interview
                  </h1>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Briefcase className="size-4 text-primary-300" />
                    <span className="text-sm font-medium text-light-200 capitalize">{interview?.level || 'All Levels'}</span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Target className="size-4 text-accent-300" />
                    <span className="text-sm font-medium text-light-200 capitalize">{interview?.type}</span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                    <Clock className="size-4 text-info-100" />
                    <span className="text-sm font-medium text-light-200">~30 minutes</span>
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-light-300">Technologies:</span>
                  <DisplayTechIcons techStack={interview?.techstack || []} />
                </div>
              </div>
            </div>

            {/* Right Side - Type Badge */}
            <div className="px-6 py-3 rounded-2xl backdrop-blur-md bg-gradient-to-r from-primary-500/20 to-accent-300/20 border border-primary-400/30">
              <p className="text-lg font-bold text-primary-200 capitalize">{interview?.type} Session</p>
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

      {/* Agent Component - Interview Interface */}
      <div className="animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
        <Agent
          userName={user?.name ?? ""}
          userId={user?.id}
          interviewId={sessionId}
          type="interview"
          questions={interview?.questions}
          jobTitle={interview?.role}
          jobLevel={interview?.level}
          jobDescription={interview?.jobDescription || ''}
          resumeText={interview?.resumeText || ''}
        />
      </div>
    </div>
  );
}

export default Page;