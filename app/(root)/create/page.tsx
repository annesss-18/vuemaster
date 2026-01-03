import React from 'react'
import CreateInterviewForm from '@/components/CreateInterviewForm'
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
          Interview Setup
        </h1>
        <p className="text-light-300 text-base md:text-lg max-w-2xl mx-auto">
          Configure your session by providing the job context and your background
        </p>
      </div>

      {/* Pass the userId to the client component */}
      <CreateInterviewForm userId={user.id} />
    </div>
  )
}

export default InterviewPage