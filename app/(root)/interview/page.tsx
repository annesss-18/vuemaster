import React from 'react'

import { getCurrentUser } from '@/lib/actions/auth.action'
import { redirect } from 'next/navigation'

const InterviewPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="w-full min-h-[calc(100vh-200px)] py-10">
      <div className="mb-8 text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Interview Dashboard
        </h1>
        <p className="text-light-300 text-base md:text-lg max-w-2xl mx-auto">
          Manage your interview sessions and templates
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {/* Create New Card */}
        <div className="card-border">
          <div className="card !p-8 flex flex-col items-center justify-center text-center space-y-4 hover:bg-white/5 transition-colors">
            <div className="size-16 rounded-full bg-primary-500/20 flex items-center justify-center mb-2">
              <span className="text-3xl text-primary-300">+</span>
            </div>
            <h2 className="text-xl font-bold text-light-100">Start New Interview</h2>
            <p className="text-light-300">Create a new custom interview session tailored to your job description.</p>
            <a href="/interview/create" className="btn-primary w-full mt-4">Create New</a>
          </div>
        </div>

        {/* Placeholder for Recent Sessions */}
        <div className="card-border">
          <div className="card !p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="size-16 rounded-full bg-accent-300/20 flex items-center justify-center mb-2">
              <span className="text-3xl text-accent-300">H</span>
            </div>
            <h2 className="text-xl font-bold text-light-100">History (Coming Soon)</h2>
            <p className="text-light-300">View your past interview sessions and performance feedback.</p>
            <button className="btn-secondary w-full mt-4" disabled>View History</button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default InterviewPage