import React from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { getInterviewsByUserId, getUserTemplates } from '@/lib/actions/general.action'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InterviewCard from '@/components/InterviewCard'
import { Plus, History, Layout, PlayCircle } from 'lucide-react'

const Dashboard = async () => {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const [sessions, myTemplates] = await Promise.all([
    getInterviewsByUserId(user.id),
    getUserTemplates(user.id)
  ]);

  // Filter Sessions
  const activeSessions = sessions?.filter(s => s.status !== 'completed') || [];
  const completedSessions = sessions?.filter(s => s.status === 'completed') || [];

  return (
    <div className="container-app py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Dashboard</h1>
          <p className="text-light-300 mt-1">Manage your interviews and track your progress.</p>
        </div>
        <Link href="/create" className="btn-primary">
          <Plus className="size-5 mr-2" />
          New Interview
        </Link>
      </div>

      <Tabs defaultValue="practice" className="w-full">
        <TabsList className="bg-dark-200/50 p-1 rounded-xl mb-8">
          <TabsTrigger value="practice" className="flex gap-2">
            <PlayCircle className="size-4" /> Practice
          </TabsTrigger>
          <TabsTrigger value="history" className="flex gap-2">
            <History className="size-4" /> History
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex gap-2">
            <Layout className="size-4" /> My Templates
          </TabsTrigger>
        </TabsList>

        {/* 1. Practice Tab (Active Sessions) */}
        <TabsContent value="practice" className="space-y-6 animate-fadeIn">
          <h2 className="text-xl font-semibold text-light-100">Active Sessions</h2>
          {activeSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSessions.map((session) => (
                // Note: We will update InterviewCard props in the next step to handle 'type="session"'
                <InterviewCard 
                  key={session.id} 
                  id={session.id}
                  role={session.role}
                  techstack={session.techstack}
                  createdAt={session.createdAt}
                  type="active-session" // Temporary prop until next step
                  isSession={true} // Backward compat
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed border-light-400/20 rounded-2xl">
              <p className="text-light-300">No active sessions. Start one from your templates!</p>
            </div>
          )}
        </TabsContent>

        {/* 2. History Tab (Completed Sessions) */}
        <TabsContent value="history" className="space-y-6 animate-fadeIn">
          <h2 className="text-xl font-semibold text-light-100">Past Interviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedSessions.map((session) => (
               <InterviewCard 
                 key={session.id} 
                 id={session.id}
                 userId={user.id} // Needed to fetch feedback score inside card
                 role={session.role}
                 techstack={session.techstack}
                 createdAt={session.createdAt}
                 type="completed-session"
                 isSession={true}
               />
            ))}
          </div>
        </TabsContent>

        {/* 3. My Templates Tab */}
        <TabsContent value="templates" className="space-y-6 animate-fadeIn">
          <h2 className="text-xl font-semibold text-light-100">My Custom Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTemplates?.map((template) => (
               <InterviewCard 
                 key={template.id} 
                 id={template.id}
                 role={template.role}
                 techstack={template.techStack}
                 createdAt={template.createdAt}
                 type="template"
                 isSession={false}
               />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Dashboard