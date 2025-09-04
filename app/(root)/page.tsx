import { Button } from '@/components/ui/button'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { dummyInterviews } from '@/constants'
import InterviewCard from '@/components/InterviewCard'

const page = () => {
  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2> Get Interview ready with AI-Powered Mock Interviews</h2>
          <p>Practice technical and behavioral interviews with our AI-powered platform. Get instant feedback and improve your skills.</p>
          <Button asChild className='btn-primary w-full'>
            <Link href="/interview">
              Start an Interview
            </Link>
          </Button>
        </div>
        <Image src="/robot.png" alt="robot" width={400} height={400} className="max-sm:hidden" />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>
        <div className="interviews-section">
          {dummyInterviews.map((interview) => (
            <InterviewCard {...interview} key = {interview.id}/> 
          ))}

          {/* <p>You haven't taken any interviews yet</p> */}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2> Take an Interview </h2>

        <div className="interviews-section">
          {dummyInterviews.map((interview) => (
            <InterviewCard {...interview} key = {interview.id}/> 
          ))}

          {/* <p></p> */}
        </div>
      </section>
    </>
  )
}

export default page