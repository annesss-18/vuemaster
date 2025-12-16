import React from 'react'
import CreateInterviewForm from '@/components/CreateInterviewForm' // Import the new form
import { getCurrentUser } from '@/lib/actions/auth.action'
import { redirect } from 'next/navigation'

const InterviewPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="container py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Interview Setup</h1>
        <p className="text-muted-foreground mt-2">
          Configure your session by providing the job context and your background.
        </p>
      </div>
      
      {/* Pass the userId to the client component */}
      <CreateInterviewForm userId={user.id} />
    </div>
  )
}

export default InterviewPage