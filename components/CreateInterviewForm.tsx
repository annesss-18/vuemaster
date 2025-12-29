"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Link as LinkIcon, Upload, Loader2, FileUp, Sparkles, Zap, CheckCircle2 } from 'lucide-react'
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

interface CreateInterviewFormProps {
  userId: string
}

export default function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  const [currentStep, setCurrentStep] = useState<'input' | 'processing'>('input')

  // State for Job Description
  const [role, setRole] = useState('')
  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)

  // State for Interview Type
  const [interviewType, setInterviewType] = useState<'Technical' | 'Behavioral' | 'System Design' | 'HR' | 'Mixed'>('Technical')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!role.trim()) {
      return toast.error("Please enter the Target Role (e.g. Senior Frontend Engineer)")
    }

    if (jdType === 'text' && !jdText) {
      return toast.error("Please paste the job description")
    }

    if (jdType === 'text' && jdText.length < 50) {
      return toast.error("Job description is too short. Please provide at least 50 characters.")
    }

    if (jdType === 'url' && !jdUrl) {
      return toast.error("Please enter a valid URL")
    }

    // Validate and sanitize URL
    if (jdType === 'url') {
      const sanitizedURL = validateAndSanitizeURL(jdUrl)
      if (!sanitizedURL) {
        return toast.error("Invalid or blocked URL. Please use a public URL.")
      }
    }

    if (jdType === 'file' && !jdFile) {
      return toast.error("Please upload a JD file")
    }

    // Validate file uploads
    if (jdFile) {
      const fileValidation = validateFileUpload(jdFile)
      if (!fileValidation.valid) {
        return toast.error(fileValidation.error || "Invalid file")
      }
    }

    setIsLoading(true)
    setCurrentStep('processing')

    try {
      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('role', role)
      formData.append('jdType', jdType)
      formData.append('type', interviewType) // Note: Changed 'interviewType' key to 'type' to match draft route expectation if needed, or update route to match. Draft route expects 'type'.
      // Note: Draft route expects 'role' input if no JD, but here we assume JD is present or extracted.
      // But wait, the draft route requires 'role' input or JD.
      // The current form does NOT have a role input. It relies on AI to extract it.
      // The draft route says: if (!jdText && !roleInput) ...
      // So JD is sufficient.

      // Append JD Logic
      if (jdType === 'text') {
        formData.append('jdInput', jdText)
      } else if (jdType === 'url') {
        formData.append('jdInput', jdUrl)
      } else if (jdType === 'file' && jdFile) {
        formData.append('jdInput', jdFile)
      }

      // We should use the NEW draft route
      const res = await fetch('/api/interview/draft', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate interview draft")
      }

      setDraftData(data)
      toast.success("Interview Draft Generated! Please review.")

    } catch (error) {
      logger.error('Interview generation error:', error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"
      toast.error(errorMessage)
      setCurrentStep('input')
    } finally {
      setIsLoading(false)
    }
  }

  if (draftData) {
    return <InterviewEditor initialDraft={draftData} />
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fadeIn">
      {/* Header Section */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-400/30 backdrop-blur-md">
          <Sparkles className="size-4 text-primary-300 animate-pulse" />
          <span className="text-sm font-semibold text-primary-200">AI Interview Generator</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold">
          Create Your Custom{' '}
          <span className="block mt-2 bg-gradient-to-r from-primary-300 via-accent-300 to-primary-400 bg-clip-text text-transparent">
            Mock Interview
          </span>
        </h1>

        <p className="text-lg text-light-300 max-w-2xl mx-auto">
          Our AI will analyze the job description and generate tailored interview questions just for you
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <div className={`flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 ${currentStep === 'input'
          ? 'bg-primary-500/20 border-2 border-primary-400/50'
          : 'bg-success-100/20 border-2 border-success-100/50'
          }`}>
          {currentStep === 'processing' ? (
            <CheckCircle2 className="size-5 text-success-100" />
          ) : (
            <div className="size-5 rounded-full bg-primary-400 flex items-center justify-center text-xs font-bold text-white">1</div>
          )}
          <span className="font-semibold text-sm">Job Description</span>
        </div>

        <div className="h-[2px] w-16 bg-gradient-to-r from-primary-400/50 to-accent-300/50" />

        <div className={`flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 ${currentStep === 'processing'
          ? 'bg-primary-500/20 border-2 border-primary-400/50'
          : 'bg-dark-200 border-2 border-primary-400/20'
          }`}>
          <div className={`size-5 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'processing' ? 'bg-primary-400 text-white' : 'bg-dark-300 text-light-400'
            }`}>
            2
          </div>
          <span className="font-semibold text-sm">AI Analysis</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="card-border animate-slideInLeft">
        <Card className="bg-gradient-to-br from-dark-50 to-dark-100 border-none">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <FileText className="size-6 text-primary-300" />
              Job Description Input
            </CardTitle>
            <CardDescription className="text-light-300">
              Choose how you&apos;d like to provide the job description. Our AI will extract key requirements and generate relevant questions.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Role Input */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-base font-semibold text-light-100">
                  Target Role / Job Title <span className="text-primary-300">*</span>
                </Label>
                <Input
                  id="role"
                  placeholder="e.g. Senior Frontend Engineer, Product Manager"
                  className="h-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-xl transition-all duration-300 backdrop-blur-sm focus:border-primary-400/50"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              {/* Interview Type Selector */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-light-100 flex items-center gap-2">
                  <Sparkles className="size-4 text-accent-300" />
                  Interview Type
                </Label>

                <div className="grid grid-cols-1 gap-3">
                  {([
                    { value: 'Technical' as const, label: 'Technical Interview', desc: 'Coding, algorithms, and technical problem-solving' },
                    { value: 'Behavioral' as const, label: 'Behavioral Interview', desc: 'Past experiences, soft skills, and situational questions' },
                    { value: 'System Design' as const, label: 'System Design Interview', desc: 'Architecture, scalability, and design decisions' },
                    { value: 'HR' as const, label: 'HR/Cultural Fit', desc: 'Company values, team fit, and career goals' },
                    { value: 'Mixed' as const, label: 'Mixed Interview', desc: 'Combination of technical and behavioral questions' },
                  ]).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setInterviewType(type.value);
                      }}
                      className={cn(
                        "p-4 rounded-xl text-left transition-all duration-300 border-2",
                        interviewType === type.value
                          ? "bg-primary-500/20 border-primary-400/50 shadow-glow"
                          : "bg-dark-200/30 border-primary-400/20 hover:border-primary-400/40 hover:bg-dark-200/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
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

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent" />

              {/* Input Method Selector */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-light-100 flex items-center gap-2">
                  <Zap className="size-4 text-accent-300" />
                  Choose Input Method
                </Label>

                <Tabs
                  defaultValue="text"
                  onValueChange={(v: string) => setJdType(v as 'text' | 'url' | 'file')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 p-1 rounded-2xl backdrop-blur-sm bg-dark-200/50">
                    <TabsTrigger
                      value="text"
                      className="flex items-center gap-2 rounded-xl transition-all duration-300"
                    >
                      <FileText className="size-4" />
                      Paste Text
                    </TabsTrigger>
                    <TabsTrigger
                      value="url"
                      className="flex items-center gap-2 rounded-xl transition-all duration-300"
                    >
                      <LinkIcon className="size-4" />
                      URL Link
                    </TabsTrigger>
                    <TabsTrigger
                      value="file"
                      className="flex items-center gap-2 rounded-xl transition-all duration-300"
                    >
                      <Upload className="size-4" />
                      Upload File
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab: Paste Text */}
                  <TabsContent value="text" className="mt-6 space-y-4 animate-fadeIn">
                    <div className="space-y-2">
                      <Label htmlFor="jd-text" className="text-sm font-medium text-light-200">
                        Job Description Text
                      </Label>
                      <Textarea
                        id="jd-text"
                        placeholder="Paste the complete job description here...

Example:
We are looking for a Senior Full Stack Developer with 5+ years of experience in React, Node.js, and AWS..."
                        className="min-h-[280px] bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl transition-all duration-300 text-light-100 resize-none backdrop-blur-sm"
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                      />
                      <p className="text-xs text-light-400 flex items-center gap-2">
                        <span className={jdText.length >= 50 ? 'text-success-100' : 'text-warning-200'}>
                          {jdText.length} characters
                        </span>
                        <span>•</span>
                        <span>Minimum 50 characters required</span>
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab: URL */}
                  <TabsContent value="url" className="mt-6 space-y-4 animate-fadeIn">
                    <div className="space-y-2">
                      <Label htmlFor="jd-url" className="text-sm font-medium text-light-200">
                        Job Posting URL
                      </Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-light-400" />
                        <Input
                          id="jd-url"
                          type="url"
                          placeholder="https://linkedin.com/jobs/view/..."
                          className="pl-12 bg-dark-200/50 border-2 border-primary-400/20 rounded-2xl transition-all duration-300 h-14 backdrop-blur-sm"
                          value={jdUrl}
                          onChange={(e) => setJdUrl(e.target.value)}
                        />
                      </div>
                      <div className="p-4 rounded-xl bg-info-100/10 border border-info-100/30 backdrop-blur-sm">
                        <p className="text-xs text-light-300 flex items-start gap-2">
                          <span className="text-info-100 font-semibold">Note:</span>
                          <span>Ensure the URL is publicly accessible and not behind a login wall. We support LinkedIn, Indeed, Glassdoor, and most job boards.</span>
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab: File Upload */}
                  <TabsContent value="file" className="mt-6 space-y-4 animate-fadeIn">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-light-200">
                        Upload Job Description
                      </Label>
                      <div className="relative border-2 border-dashed border-primary-400/30 rounded-2xl p-12 text-center hover:border-primary-400/50 hover:bg-dark-200/30 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                        <Input
                          type="file"
                          accept=".pdf,.txt,.docx"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                        />
                        <div className="flex flex-col items-center gap-4">
                          <div className="size-16 rounded-2xl bg-primary-500/20 border-2 border-primary-400/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-primary-400/50">
                            <FileUp className="size-8 text-primary-300" />
                          </div>
                          <div className="space-y-2">
                            <p className="font-semibold text-light-100">
                              {jdFile ? (
                                <span className="text-primary-300">{jdFile.name}</span>
                              ) : (
                                "Click to Upload or Drag & Drop"
                              )}
                            </p>
                            <p className="text-sm text-light-400">
                              Supports PDF, DOCX, and TXT files (Max 10MB)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-primary-400/20">
                <Button
                  type="submit"
                  className="w-full min-h-16 rounded-2xl text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="size-6 animate-spin" />
                      <div className="space-y-1 text-left">
                        <div className="font-bold">Analyzing Job Description...</div>
                        <div className="text-xs opacity-80">AI is extracting requirements and generating questions</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Sparkles className="size-6" />
                      <span className="font-bold">Generate AI Interview</span>
                      <Zap className="size-6" />
                    </div>
                  )}
                </Button>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-400/20 backdrop-blur-sm">
                  <CheckCircle2 className="size-5 text-primary-300 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-light-100">Smart Analysis</p>
                    <p className="text-xs text-light-400">AI extracts key skills and requirements</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-success-100/10 border border-success-100/20 backdrop-blur-sm">
                  <CheckCircle2 className="size-5 text-success-100 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-light-100">Tailored Questions</p>
                    <p className="text-xs text-light-400">Role-specific interview scenarios</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-300/10 border border-accent-300/20 backdrop-blur-sm">
                  <CheckCircle2 className="size-5 text-accent-300 shrink-0 mt-0.5" />
                  <div className="space-y-1">
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