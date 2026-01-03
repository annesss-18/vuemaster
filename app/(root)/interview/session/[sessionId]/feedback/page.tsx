import { getCurrentUser } from '@/lib/actions/auth.action';
import { getFeedbackByInterviewId, getInterviewsById } from '@/lib/actions/general.action';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Home,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { RouteParams } from '@/types';

const Page = async ({ params }: RouteParams) => {
  const { sessionId } = await params;

  // Guard: ensure route param exists
  if (!sessionId || typeof sessionId !== 'string') {
    redirect('/');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const interview = await getInterviewsById(sessionId, user.id);
  if (!interview) redirect('/');

  const feedback = await getFeedbackByInterviewId({
    interviewId: sessionId,
    userId: user.id
  });

  logger.info('FEEDBACK:', feedback);

  if (!feedback) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fadeIn">
        <div className="card-border">
          <div className="card !p-12 text-center space-y-6">
            <div className="size-24 rounded-full bg-primary-500/10 border-2 border-primary-400/30 flex items-center justify-center mx-auto">
              <AlertCircle className="size-12 text-primary-300" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-light-100">No Feedback Available</h2>
              <p className="text-light-300">Complete the interview to receive detailed feedback on your performance</p>
            </div>
            <Link
              href={`/interview/session/${sessionId}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Target className="size-5" />
              <span>Take Interview</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  type CategoryItem = { name: string; score: number; comment: string };

  const formatDate = (iso?: string) => {
    if (!iso) return 'N/A';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-success-100 to-success-200';
    if (score >= 60) return 'from-warning-200 to-accent-200';
    return 'from-destructive-100 to-destructive-200';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-success-100';
    if (score >= 60) return 'text-warning-200';
    return 'text-destructive-100';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      {/* Header Section */}
      <header className="card-border animate-slideInLeft">
        <div className="card !p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-100/20 border border-success-100/30 backdrop-blur-md w-fit">
                <Sparkles className="size-3 text-success-100" />
                <span className="text-xs font-semibold text-success-100">Interview Completed</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
                  Performance Report
                </h1>
                <p className="text-sm text-light-400">Interview ID: <span className="text-light-300 font-mono">{feedback.interviewId}</span></p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-200/60 border border-primary-400/20 backdrop-blur-sm">
                <Calendar className="size-4 text-primary-300" />
                <span className="text-sm font-medium text-light-200">{formatDate(feedback.createdAt)}</span>
              </div>

              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-primary-300 hover:text-primary-200 transition-colors duration-300 font-semibold"
              >
                <Home className="size-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Overall Score Section */}
      <section className="card-border animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
        <div className="card !p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative size-48 rounded-full bg-gradient-to-br from-dark-200 to-dark-300 flex items-center justify-center border-8 border-primary-400/30 shadow-2xl">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreTextColor(feedback.totalScore)}`}>
                    {feedback.totalScore}
                  </div>
                  <div className="text-xl text-light-400 font-semibold">/100</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Award className={`size-6 ${getScoreTextColor(feedback.totalScore)}`} />
                  <h2 className="text-2xl font-bold text-light-100">Overall Performance</h2>
                </div>
                <p className="text-light-300">
                  {feedback.totalScore >= 80
                    ? "Outstanding performance! You demonstrated excellent understanding and communication."
                    : feedback.totalScore >= 60
                      ? "Good performance with room for improvement. Keep practicing to enhance your skills."
                      : "There's significant room for growth. Focus on the areas highlighted below."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-light-400">Score Distribution</span>
                  <span className={`font-bold ${getScoreTextColor(feedback.totalScore)}`}>
                    {feedback.totalScore}%
                  </span>
                </div>
                <div className="w-full h-4 bg-dark-200 rounded-full overflow-hidden">
                  <div
                    className={`h-4 bg-gradient-to-r ${getScoreColor(feedback.totalScore)} transition-all duration-1000 ease-out rounded-full shadow-lg`}
                    style={{ width: `${feedback.totalScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Scores Grid */}
      <section className="space-y-4 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-2xl font-bold text-light-100 flex items-center gap-2">
          <Target className="size-6 text-primary-300" />
          Performance Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(feedback.categoryScoresArray) && feedback.categoryScoresArray.map((cat: CategoryItem, idx: number) => (
            <div
              key={cat.name}
              className="card-border animate-fadeIn"
              style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
            >
              <div className="card !p-6 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-light-100">{cat.name}</h3>
                  <div className={`text-2xl font-bold ${getScoreTextColor(cat.score)}`}>
                    {cat.score}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="w-full h-2.5 bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className={`h-2.5 bg-gradient-to-r ${getScoreColor(cat.score)} transition-all duration-1000 ease-out`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>

                  <p className="text-sm text-light-300 leading-relaxed">{cat.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strengths and Improvements */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slideInLeft" style={{ animationDelay: '0.4s' }}>
        <div className="card-border">
          <div className="card !p-6 !bg-gradient-to-br !from-success-100/5 !to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-xl bg-success-100/20 border border-success-100/30 flex items-center justify-center">
                <TrendingUp className="size-6 text-success-100" />
              </div>
              <h3 className="text-xl font-bold text-light-100">Key Strengths</h3>
            </div>

            <ul className="space-y-3">
              {Array.isArray(feedback.strengths) && feedback.strengths.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-3 animate-fadeIn" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                  <CheckCircle2 className="size-5 text-success-100 shrink-0 mt-0.5" />
                  <span className="text-sm text-light-200 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card-border">
          <div className="card !p-6 !bg-gradient-to-br !from-warning-200/5 !to-transparent">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-xl bg-warning-200/20 border border-warning-200/30 flex items-center justify-center">
                <TrendingDown className="size-6 text-warning-200" />
              </div>
              <h3 className="text-xl font-bold text-light-100">Areas for Improvement</h3>
            </div>

            <ul className="space-y-3">
              {Array.isArray(feedback.areasForImprovement) && feedback.areasForImprovement.map((a: string, i: number) => (
                <li key={i} className="flex items-start gap-3 animate-fadeIn" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                  <AlertCircle className="size-5 text-warning-200 shrink-0 mt-0.5" />
                  <span className="text-sm text-light-200 leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final Assessment */}
      <section className="card-border animate-slideInLeft" style={{ animationDelay: '0.5s' }}>
        <div className="card !p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="size-12 rounded-xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="size-6 text-primary-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-light-100 mb-2">Final Assessment</h3>
              <p className="text-light-200 leading-relaxed">{feedback.finalAssessment}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-primary-400/20 flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="btn-secondary flex-1 !justify-center"
            >
              <Home className="size-5" />
              <span>Return to Dashboard</span>
            </Link>
            <Link
              href="/interview"
              className="btn-primary flex-1 !justify-center"
            >
              <Target className="size-5" />
              <span>Practice More</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page;