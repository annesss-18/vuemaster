import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import InterviewCard from '@/components/InterviewCard'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getInterviewsByUserId, getLatestInterviews } from '@/lib/actions/general.action'
import { Sparkles, TrendingUp, Zap, ArrowRight, Star, Target } from 'lucide-react'

const Page = async () => {
  const user = await getCurrentUser();
  const [userInterviews, latestInterviews] = await Promise.all([
    user ? getInterviewsByUserId(user.id) : Promise.resolve(null),
    getLatestInterviews({ userId: user?.id || '' })
  ]);

  const hasPastInterviews = !!(userInterviews && userInterviews.length > 0);
  const hasUpcomingInterviews = !!(latestInterviews && latestInterviews.length > 0);

  return (
    <div className="container-app">
      {/* Hero Section with Enhanced CTA */}
      <section className="card-cta animate-fadeIn mb-20 md:mb-24">
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            {/* Animated Badge */}
            <div className="badge-text">
              <Sparkles className="size-4 text-primary-300 animate-pulse" />
              <span>AI-Powered Interview Practice</span>
            </div>

            {/* Hero Heading with Gradient */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                Master Your Next Interview with{' '}
                <span className="block mt-2 text-gradient-primary">
                  Real-Time AI Feedback
                </span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-light-200 leading-relaxed max-w-xl">
              Practice technical and behavioral interviews with our advanced AI interviewer.
              Get instant, detailed feedback and level up your interview skills in minutes.
            </p>

            {/* Enhanced CTA Button */}
            <Link href="/interview" className='btn-primary text-base md:text-lg px-8 py-4 group'>
              <Zap className="size-5" />
              <span>Start Your Interview</span>
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-primary-400/20">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-success-400 animate-pulse" />
                <span className="text-sm text-light-300 font-medium">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-info-400 animate-pulse" />
                <span className="text-sm text-light-300 font-medium">Real-Time Feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-accent-400 animate-pulse" />
                <span className="text-sm text-light-300 font-medium">Instant Results</span>
              </div>
            </div>
          </div>

          {/* Animated Robot Image with Glow */}
          <div className="relative hidden md:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-3xl animate-pulse-slow" />
            <Image
              src="/robot.png"
              alt="AI Interview Assistant"
              width={500}
              height={500}
              className="relative z-10 drop-shadow-2xl animate-fadeIn transition-transform duration-700 hover:scale-105 will-change-transform"
              priority
            />
          </div>
        </div>
      </section>

      {/* Your Interviews Section */}
      {hasPastInterviews && (
        <section className="section-spacing-sm animate-slideInLeft animation-delay-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="flex items-center gap-3 text-3xl lg:text-4xl font-bold tracking-tight text-white">
                <TrendingUp className="size-8 text-primary-300" />
                Your Interview Journey
              </h2>
              <p className="text-light-300 text-lg">Track your progress and review past performances</p>
            </div>

            <Link
              href="/interview"
              className="btn-ghost gap-2 self-start md:self-auto"
            >
              <span>View All</span>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userInterviews?.map((interview: Interview, index: number) => (
              <div
                key={interview.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <InterviewCard
                  id={interview.id}
                  userId={user?.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={interview.createdAt}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Divider */}
      {hasPastInterviews && hasUpcomingInterviews && (
        <div className="divider my-16" />
      )}

      {/* Available Interviews Section */}
      {hasUpcomingInterviews && (
        <section className="section-spacing-sm animate-slideInLeft animation-delay-300">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="space-y-2">
              <h2 className="flex items-center gap-3 text-3xl lg:text-4xl font-bold tracking-tight text-white">
                <Star className="size-8 text-accent-300" />
                Explore Interviews
              </h2>
              <p className="text-light-300 text-lg">Discover new interview challenges from the community</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestInterviews?.map((interview: Interview, index: number) => (
              <div
                key={interview.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <InterviewCard
                  id={interview.id}
                  userId={user?.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={interview.createdAt}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State - when user has no interviews */}
      {!hasPastInterviews && !hasUpcomingInterviews && (
        <section className="section-spacing animate-fadeIn">
          <div className="card-cta max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex p-6 rounded-full bg-primary-500/20 border border-primary-400/30">
                <Target className="size-12 text-primary-300" />
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Ready to Start Your Journey?
              </h2>

              <p className="text-lg text-light-300 leading-relaxed">
                No interviews yet! Create your first AI-powered interview session and get personalized feedback to ace your next real interview.
              </p>
            </div>

            <Link href="/interview" className="btn-primary text-lg px-10 py-5 group">
              <Sparkles className="size-6" />
              <span>Create Your First Interview</span>
              <ArrowRight className="size-6 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

export default Page
  ;