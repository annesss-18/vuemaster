"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Link as LinkIcon, Upload, Loader2, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateAndSanitizeURL, validateFileUpload } from '@/lib/validation'
import { logger } from '@/lib/logger'

interface CreateInterviewFormProps {
  userId: string
}

export default function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // State for Job Description
  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)

  // State for Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
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

    if (resumeFile) {
      const resumeValidation = validateFileUpload(resumeFile, {
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      })
      if (!resumeValidation.valid) {
        return toast.error(resumeValidation.error || "Invalid resume file")
      }
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('jdType', jdType)

      // Append JD Logic
      if (jdType === 'text') {
        formData.append('jdInput', jdText)
      } else if (jdType === 'url') {
        formData.append('jdInput', jdUrl)
      } else if (jdType === 'file' && jdFile) {
        formData.append('jdInput', jdFile)
      }

      // Append Resume
      if (resumeFile) {
        formData.append('resume', resumeFile)
      }

      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate interview")
      }

      toast.success("Interview generated successfully!")
      router.push(`/interview/${data.interviewId}`)

    } catch (error) {
      logger.error('Interview generation error:', error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Interview</CardTitle>
          <CardDescription>
            Provide the job details and your resume to generate a tailored interview session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- SECTION 1: JOB DESCRIPTION --- */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Job Description Source</Label>
              
              <Tabs defaultValue="text" onValueChange={(v) => setJdType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> URL Link
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload File
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Paste Text */}
                <TabsContent value="text">
                  <Textarea 
                    placeholder="Paste the full job description here..."
                    className="min-h-[200px]"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                </TabsContent>

                {/* Tab: URL */}
                <TabsContent value="url">
                  <div className="flex gap-2">
                    <Input 
                      type="url" 
                      placeholder="https://linkedin.com/jobs/..." 
                      value={jdUrl}
                      onChange={(e) => setJdUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Ensure the URL is public and not behind a login wall.
                  </p>
                </TabsContent>

                {/* Tab: File Upload */}
                <TabsContent value="file">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer relative">
                    <Input 
                      type="file" 
                      accept=".pdf,.txt,.docx"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <FileUp className="w-8 h-8 text-muted-foreground" />
                      <p className="font-medium">
                        {jdFile ? jdFile.name : "Click to Upload Job Description"}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX or TXT</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="h-px bg-border my-6" />

            {/* --- SECTION 2: RESUME --- */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Your Resume (Optional)</Label>
              <div className="border rounded-md p-4 bg-secondary/20">
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept=".pdf,.docx"
                    className="cursor-pointer bg-background"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Uploading your resume allows the AI to ask questions specific to your experience gaps.
                </p>
              </div>
            </div>

            {/* --- SUBMIT --- */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Documents...
                </>
              ) : (
                "Generate Interview"
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}