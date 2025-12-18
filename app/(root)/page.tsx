import { Button } from '@/components/ui/button'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import InterviewCard from '@/components/InterviewCard'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getInterviewsByUserId, getLatestInterviews } from '@/lib/actions/general.action'
import { Sparkles, TrendingUp, Zap, ArrowRight } from 'lucide-react'

const Page = async () => {
  const user = await getCurrentUser();
  const [userInterviews, latestInterviews] = await Promise.all([
    user ? getInterviewsByUserId(user.id) : Promise.resolve(null),
    getLatestInterviews({ userId: user?.id || '' })
  ]);
  
  const hasPastInterviews = !!(userInterviews && userInterviews.length > 0);
  const hasUpcomingInterviews = !!(latestInterviews && latestInterviews.length > 0);

  return (
    <>
      {/* Hero Section with Enhanced CTA */}
      <section className="card-cta animate-slideInLeft">
        <div className="relative z-10 flex flex-col gap-8 max-w-2xl">
          {/* Animated Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md w-fit">
            <Sparkles className="size-4 text-primary-300 animate-pulse" />
            <span className="text-sm font-semibold text-primary-200">AI-Powered Interview Practice</span>
          </div>

          {/* Hero Heading with Gradient */}
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Master Your Next Interview with{' '}
            <span className="block mt-2 bg-gradient-to-r from-primary-300 via-accent-300 to-primary-400 bg-clip-text text-transparent">
              Real-Time AI Feedback
            </span>
          </h1>
          
          <p className="text-lg text-light-200 leading-relaxed">
            Practice technical and behavioral interviews with our advanced AI interviewer. 
            Get instant, detailed feedback and level up your interview skills in minutes.
          </p>
          
          {/* Enhanced CTA Button */}
          <Link href="/interview" className='btn-primary w-full sm:w-auto flex items-center justify-center gap-3'>
            <Zap className="size-5" />
            <span>Start Your Interview</span>
            <ArrowRight className="size-5 transition-transform duration-300 hover:translate-x-1" />
          </Link>

          {/* Stats Row */}
          <div className="flex items-center gap-6 pt-4 border-t border-primary-400/20">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-success-100 animate-pulse" />
              <span className="text-sm text-light-300">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-info-100 animate-pulse" />
              <span className="text-sm text-light-300">Real-Time Feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-accent-200 animate-pulse" />
              <span className="text-sm text-light-300">Instant Results</span>
            </div>
          </div>
        </div>
        
        {/* Animated Robot Image with Glow */}
        <div className="relative max-sm:hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-accent-300/30 rounded-full blur-3xl animate-pulse" />
          <Image 
            src="/robot.png" 
            alt="AI Interview Assistant" 
            width={450} 
            height={450} 
            className="relative z-10 drop-shadow-2xl animate-fadeIn transition-transform duration-700 hover:scale-110"
            priority
          />
        </div>
      </section>

      {/* Your Interviews Section */}
      <section className="flex flex-col gap-8 mt-16 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="flex items-center gap-3">
              <TrendingUp className="size-8 text-primary-300" />
              Your Interview Journey
            </h2>
            <p className="text-light-300">Track your progress and review past performances</p>
          </div>
          
          {hasPastInterviews && (
            <Link 
              href="/interview" 
              className="text-primary-300 hover:text-primary-200 transition-colors duration-300 flex items-center gap-2 text-sm font-semibold"
            >
              View All
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews?.map((interview, index) => (
              <div 
                key={interview.id} 
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <InterviewCard {...interview} />
              </div>
            ))
          ) : (
            <div className="card-border w-full min-h-[300px]">
              <div className="card flex flex-col items-center justify-center gap-6 text-center p-12">
                <div className="size-24 rounded-full bg-primary-500/10 border-2 border-primary-400/30 flex items-center justify-center">
                  <Sparkles className="size-12 text-primary-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-light-100">No Interviews Yet</h3>
                  <p className="text-light-300 max-w-md">
                    Start your first AI-powered mock interview and get instant feedback to improve your skills
                  </p>
                </div>
                <Link href="/interview" className="btn-primary mt-4">
                  Create Your First Interview
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Available Interviews Section */}
      <section className="flex flex-col gap-8 mt-16 animate-slideInRight" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="flex items-center gap-3">
              <Zap className="size-8 text-accent-300" />
              Ready to Practice
            </h2>
            <p className="text-light-300">Explore curated interview challenges</p>
          </div>
        </div>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            latestInterviews?.map((interview, index) => (
              <div 
                key={interview.id} 
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <InterviewCard {...interview} />
              </div>
            ))
          ) : (
            <div className="card-border w-full min-h-[300px]">
              <div className="card flex flex-col items-center justify-center gap-6 text-center p-12">
                <div className="size-24 rounded-full bg-accent-300/10 border-2 border-accent-300/30 flex items-center justify-center">
                  <TrendingUp className="size-12 text-accent-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-light-100">No Available Interviews</h3>
                  <p className="text-light-300 max-w-md">
                    Check back soon for new interview challenges or create your own custom interview
                  </p>
                </div>
                <Link href="/interview" className="btn-primary mt-4">
                  Create Custom Interview
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default Page;