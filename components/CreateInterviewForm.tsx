"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Link as LinkIcon, Upload, Loader2, FileUp, Sparkles, Zap, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateAndSanitizeURL, validateFileUpload } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import InterviewEditor from './InterviewEditor'
import Link from 'next/link'

interface CreateInterviewFormProps {
  userId: string
}

type InterviewType = 'Technical' | 'Behavioral' | 'System Design' | 'HR' | 'Mixed'
type InterviewLevel = 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Executive'

export default function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  // Form state
  const [role, setRole] = useState('')
  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [interviewType, setInterviewType] = useState<InterviewType>('Technical')
  const [interviewLevel, setInterviewLevel] = useState<InterviewLevel>('Mid')

  const interviewTypes: { value: InterviewType; label: string; desc: string }[] = [
    { value: 'Technical', label: 'Technical Interview', desc: 'Coding, algorithms, and technical problem-solving' },
    { value: 'Behavioral', label: 'Behavioral Interview', desc: 'Past experiences, soft skills, and situational questions' },
    { value: 'System Design', label: 'System Design Interview', desc: 'Architecture, scalability, and design decisions' },
    { value: 'HR', label: 'HR/Cultural Fit', desc: 'Company values, team fit, and career goals' },
    { value: 'Mixed', label: 'Mixed Interview', desc: 'Combination of technical and behavioral questions' },
  ]

  const experienceLevels: { value: InterviewLevel; label: string }[] = [
    { value: 'Junior', label: 'Junior (0-2 years)' },
    { value: 'Mid', label: 'Mid-Level (2-5 years)' },
    { value: 'Senior', label: 'Senior (5-8 years)' },
    { value: 'Staff', label: 'Staff (8+ years)' },
    { value: 'Executive', label: 'Executive/Leadership' },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFileUpload(file)
    if (!validation.valid) {
      toast.error(validation.error)
      e.target.value = ''
      return
    }

    setJdFile(file)
    toast.success(`${file.name} selected`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!role.trim()) {
      return toast.error("Please enter the target role")
    }

    if (jdType === 'text' && !jdText.trim()) {
      return toast.error("Please paste the job description")
    }

    if (jdType === 'text' && jdText.length < 50) {
      return toast.error("Job description is too short (minimum 50 characters)")
    }

    if (jdType === 'url') {
      const sanitizedURL = validateAndSanitizeURL(jdUrl)
      if (!sanitizedURL) {
        return toast.error("Invalid or blocked URL")
      }
    }

    if (jdType === 'file' && !jdFile) {
      return toast.error("Please upload a job description file")
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('role', role)
      formData.append('jdType', jdType)
      formData.append('type', interviewType)
      formData.append('level', interviewLevel)

      if (jdType === 'text') {
        formData.append('jdInput', jdText)
      } else if (jdType === 'url') {
        formData.append('jdInput', jdUrl)
      } else if (jdType === 'file' && jdFile) {
        formData.append('jdInput', jdFile)
      }

      const res = await fetch('/api/interview/draft', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate interview draft")
      }

      setDraftData(data)
      toast.success("Interview draft generated! Review and customize it.")

    } catch (error) {
      logger.error('Interview generation error:', error)
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (draftData) {
    return <InterviewEditor initialDraft={draftData} />
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 animate-fadeIn">
      {/* Back Button */}
      <Link 
        href="/interview"
        className="inline-flex items-center gap-2 text-light-300 hover:text-light-100 mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md">
          <Sparkles className="size-4 text-primary-300 animate-pulse" />
          <span className="text-sm font-semibold text-primary-200">AI Interview Generator</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold">
          Create Your Custom{' '}
          <span className="block mt-2 bg-gradient-to-r from-primary-300 via-accent-300 to-primary-400 bg-clip-text text-transparent">
            Interview Template
          </span>
        </h1>

        <p className="text-lg text-light-300 max-w-2xl mx-auto">
          Provide a job description and let AI generate tailored interview questions
        </p>
      </div>

      {/* Form Card */}
      <div className="card-border animate-slideInLeft">
        <Card className="bg-gradient-to-br from-dark-50 to-dark-100 border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FileText className="size-6 text-primary-300" />
              Interview Configuration
            </CardTitle>
            <CardDescription className="text-light-300">
              Configure the interview parameters and provide a job description
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Role & Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-base font-semibold text-light-100">
                    Target Role <span className="text-primary-300">*</span>
                  </Label>
                  <Input
                    id="role"
                    placeholder="e.g. Senior Frontend Engineer"
                    className="h-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-xl"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-light-100">
                    Experience Level
                  </Label>
                  <select
                    value={interviewLevel}
                    onChange={(e) => setInterviewLevel(e.target.value as InterviewLevel)}
                    className="w-full h-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-xl px-3 text-light-100 focus:outline-none focus:border-primary-400/50"
                  >
                    {experienceLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interview Type */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-light-100 flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-300" />
                  Interview Type
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {interviewTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setInterviewType(type.value)}
                      className={cn(
                        "p-4 rounded-xl text-left transition-all duration-300 border-2",
                        interviewType === type.value
                          ? "bg-primary-500/20 border-primary-400/50 shadow-glow"
                          : "bg-dark-200/30 border-primary-400/20 hover:border-primary-400/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          interviewType === type.value
                            ? "border-primary-300 bg-primary-400"
                            : "border-light-400"
                        )}>
                          {interviewType === type.value && (
                            <div className="size-2.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-light-100">{type.label}</p>
                          <p className="text-sm text-light-400">{type.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent" />

              {/* Job Description Input */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-light-100 flex items-center gap-2">
                  <Zap className="size-4 text-accent-300" />
                  Job Description Input
                </Label>

                <Tabs defaultValue="text" onValueChange={(v) => setJdType(v as 'text' | 'url' | 'file')}>
                  <TabsList className="grid w-full grid-cols-3 p-1 rounded-2xl bg-dark-200/50">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <FileText className="size-4" />
                      Paste Text
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex items-center gap-2">
                      <LinkIcon className="size-4" />
                      URL
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex items-center gap-2">
                      <Upload className="size-4" />
                      Upload
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="mt-6">
                    <Textarea
                      placeholder="Paste the complete jobdescription here..."
                      className="min-h-[240px] bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl resize-none"
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                    />
                    <p className="text-xs text-light-400 mt-2">
                      {jdText.length} / 50 characters minimum
                    </p>
                  </TabsContent>

                  <TabsContent value="url" className="mt-6">
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/jobs/view/..."
                      className="h-14 bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl"
                      value={jdUrl}
                      onChange={(e) => setJdUrl(e.target.value)}
                    />
                  </TabsContent>

                  <TabsContent value="file" className="mt-6">
                    <div className="border-2 border-dashed border-primary-400/30 rounded-2xl p-12 text-center hover:border-primary-400/50 hover:bg-dark-200/30 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        className="hidden"
                        id="jd-file"
                        onChange={handleFileChange}
                      />
                      <label htmlFor="jd-file" className="cursor-pointer">
                        <FileUp className="size-12 text-primary-300 mx-auto mb-4" />
                        <p className="font-semibold text-light-100">
                          {jdFile ? jdFile.name : "Click to Upload"}
                        </p>
                        <p className="text-sm text-light-400 mt-2">
                          PDF, DOCX, or TXT (Max 10MB)
                        </p>
                      </label>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full min-h-16 rounded-2xl text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-6 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-6" />
                    <span className="font-bold">Generate Interview Template</span>
                  </>
                )}
              </Button>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-400/20">
                  <CheckCircle2 className="size-5 text-primary-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-light-100">Smart Analysis</p>
                    <p className="text-xs text-light-400">AI extracts key requirements</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-success-100/10 border border-success-100/20">
                  <CheckCircle2 className="size-5 text-success-100 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-light-100">Tailored Questions</p>
                    <p className="text-xs text-light-400">Role-specific scenarios</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-300/10 border border-accent-300/20">
                  <CheckCircle2 className="size-5 text-accent-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-light-100">Instant Feedback</p>
                    <p className="text-xs text-light-400">Detailed performance analysis</p>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}