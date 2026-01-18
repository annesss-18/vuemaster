// components/CreateInterviewForm.tsx (FIXED & REFACTORED)
"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Upload, Loader2, Sparkles, X, CheckCircle2, ArrowLeft, Wand2, Globe, Lock, Building2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateAndSanitizeURL } from '@/lib/validation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import CompanyLogo from '@/components/CompanyLogo'

interface CreateInterviewFormProps {
  userId: string
}

const INTERVIEW_TYPES = [
  { value: 'Technical', label: 'Technical', desc: 'Coding & Problem Solving' },
  { value: 'System Design', label: 'System Design', desc: 'Architecture & Scalability' },
  { value: 'Behavioral', label: 'Behavioral', desc: 'Soft Skills & Culture' },
  { value: 'HR', label: 'HR / Fit', desc: 'Career Goals & Values' },
  { value: 'Mixed', label: 'Mixed', desc: 'Holistic Assessment' },
]

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Executive']

type Stage = 'input' | 'analyzing' | 'config' | 'generating';

export default function CreateInterviewForm({ userId }: CreateInterviewFormProps) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('input')

  // JD State
  const [jdType, setJdType] = useState<'text' | 'url' | 'file'>('text')
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)

  // Config State
  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [level, setLevel] = useState('Mid')
  const [type, setType] = useState('Technical')
  const [techStack, setTechStack] = useState<string[]>([])
  const [newTech, setNewTech] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // 1. ANALYZE JD
  const handleAnalyze = async () => {
    if (jdType === 'text' && jdText.length < 20) return toast.error("Please enter a valid job description")
    if (jdType === 'url' && !validateAndSanitizeURL(jdUrl)) return toast.error("Invalid URL")
    if (jdType === 'file' && !jdFile) return toast.error("Please upload a file")

    setStage('analyzing')

    try {
      const formData = new FormData()
      formData.append('jdType', jdType)
      if (jdType === 'text') formData.append('jdInput', jdText)
      if (jdType === 'url') formData.append('jdInput', jdUrl)
      if (jdType === 'file' && jdFile) formData.append('jdInput', jdFile)

      const res = await fetch('/api/interview/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Analysis failed")

      // Auto-fill ALL fields including company logo
      setRole(data.role || '')
      setCompanyName(data.companyName || 'Unknown Company')
      setCompanyLogoUrl(data.companyLogoUrl || '')
      setLevel(data.level || 'Mid')
      setType(data.suggestedType || 'Technical')
      setTechStack(data.techStack || [])

      if (data.cleanedJd) {
        setJdText(data.cleanedJd)
        setJdType('text')
      }

      setStage('config')
      toast.success("Analysis complete! Review the details below.")

    } catch {
      toast.error("Could not analyze JD. Please fill details manually.")
      setStage('config')
    }
  }

  // 2. GENERATE & SAVE
  const handleGenerate = async () => {
    if (!role.trim()) return toast.error("Role is required")
    if (!companyName.trim()) return toast.error("Company name is required")

    setStage('generating')
    try {
      const formData = new FormData()
      formData.append('userId', userId)
      formData.append('role', role)
      formData.append('companyName', companyName)
      formData.append('companyLogoUrl', companyLogoUrl)
      formData.append('level', level)
      formData.append('type', type)
      formData.append('jdInput', jdText)
      formData.append('techStack', JSON.stringify(techStack))
      formData.append('isPublic', String(isPublic))

      const res = await fetch('/api/interview/generate', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Generation failed")

      toast.success("Interview Template Created Successfully!")
      router.push('/dashboard')

    } catch (error) {
      console.error(error)
      toast.error("Failed to generate template")
      setStage('config')
    }
  }

  const addTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTech.trim()) {
      e.preventDefault();
      if (!techStack.includes(newTech.trim())) setTechStack([...techStack, newTech.trim()])
      setNewTech('')
    }
  }

  const removeTech = (t: string) => setTechStack(techStack.filter(i => i !== t))


  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fadeIn pb-20">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-light-400 hover:text-white mb-6">
        <ArrowLeft className="size-4" /> Back to Dashboard
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Interview</h1>
        <p className="text-light-300">Start by analyzing the job description.</p>
      </div>

      {/* STEP 1: JD INPUT */}
      <Card className={cn("border-none bg-dark-100 transition-all duration-500", stage !== 'input' && "opacity-50 pointer-events-none")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2"><FileText className="size-5 text-primary-300" /> 1. Job Description</CardTitle>
            {stage !== 'input' && <CheckCircle2 className="size-5 text-success-400" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="text" value={jdType} onValueChange={(v) => setJdType(v as 'text' | 'url' | 'file')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-dark-200/50 p-1">
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              {jdType === 'text' && (
                <Textarea
                  placeholder="Paste job description here..."
                  className="bg-dark-200/50 min-h-[150px] border-primary-400/20"
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                />
              )}
              {jdType === 'url' && (
                <Input
                  placeholder="https://linkedin.com/jobs/..."
                  className="bg-dark-200/50 h-12 border-primary-400/20"
                  value={jdUrl}
                  onChange={e => setJdUrl(e.target.value)}
                />
              )}
              {jdType === 'file' && (
                <div className="border-2 border-dashed border-primary-400/20 rounded-xl p-8 text-center bg-dark-200/20">
                  <input type="file" id="file-up" className="hidden" accept=".pdf,.docx,.txt" onChange={e => setJdFile(e.target.files?.[0] || null)} />
                  <label htmlFor="file-up" className="cursor-pointer block">
                    <Upload className="size-8 text-primary-300 mx-auto mb-2" />
                    <span className="text-sm font-medium">{jdFile ? jdFile.name : "Click to Upload PDF/DOCX"}</span>
                  </label>
                </div>
              )}
            </div>
          </Tabs>

          {stage === 'input' && (
            <Button onClick={handleAnalyze} disabled={false} className="w-full h-12 btn-primary mt-4">
              <Wand2 className="size-4" />
              Analyze & Auto-Fill
            </Button>
          )}
        </CardContent>
      </Card>

      {/* STEP 2: CONFIGURATION */}
      {(stage === 'config' || stage === 'generating') && (
        <div className="mt-8 animate-slideInUp">
          <Card className="border-none bg-gradient-to-b from-dark-200 to-dark-100 border border-primary-500/20">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="size-5 text-accent-300" /> 2. Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Company Preview */}
              {companyName && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-300/30 border border-primary-400/20">
                  <div className="relative">
                    <CompanyLogo
                      companyName={companyName}
                      logoUrl={companyLogoUrl}
                      size={60}
                      className="rounded-full bg-white p-2 ring-2 ring-primary-400/30"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-light-400 uppercase tracking-wide">Company Preview</p>
                    <p className="text-lg font-bold text-white">{companyName}</p>
                  </div>
                </div>
              )}

              {/* ROW 1: Role & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="bg-dark-300/50 border-white/10"
                    placeholder="e.g. Senior Backend Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 size-4 text-light-400" />
                    <Input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="pl-9 bg-dark-300/50 border-white/10"
                      placeholder="e.g. Google"
                    />
                  </div>
                </div>
              </div>

              {/* ROW 2: Tech Stack & Skills (Full Width) */}
              <div className="space-y-2">
                <Label>Tech Stack & Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2 p-3 bg-dark-300/30 rounded-lg min-h-[48px] border border-white/5">
                  {techStack.map(t => (
                    <span key={t} className="bg-primary-500/20 text-primary-100 px-2 py-1 rounded text-sm flex items-center gap-1 border border-primary-500/20">
                      {t} <button onClick={() => removeTech(t)}><X className="size-3 hover:text-white transition-colors" /></button>
                    </span>
                  ))}
                  <input
                    className="bg-transparent outline-none text-sm min-w-[120px] flex-1 text-white placeholder:text-light-400/50"
                    placeholder="Type & Enter to add..."
                    value={newTech}
                    onChange={e => setNewTech(e.target.value)}
                    onKeyDown={addTech}
                  />
                </div>
              </div>

              {/* ROW 3: Level, Experience, Visibility (3 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* 1. Experience Level */}
                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <div className="relative h-10">
                    <select
                      value={level}
                      onChange={e => setLevel(e.target.value)}
                      className="w-full h-full rounded-md bg-dark-300/50 border border-white/10 px-3 pr-10 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all hover:bg-dark-300/70 [&>option]:checked:bg-primary-500 [&>option]:checked:text-white"
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        backgroundImage: 'none'
                      }}
                    >
                      {LEVELS.map(l => (
                        <option
                          key={l}
                          value={l}
                          className="bg-dark-200 text-white py-2 checked:bg-primary-500"
                          style={{ background: '#1a1a2e' }}
                        >
                          {l}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="size-4 text-light-400" />
                    </div>
                  </div>
                </div>

                {/* 2. Interview Type */}
                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <div className="relative h-10">
                    <select
                      value={type}
                      onChange={e => setType(e.target.value)}
                      className="w-full h-full rounded-md bg-dark-300/50 border border-white/10 px-3 pr-10 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all hover:bg-dark-300/70 [&>option]:checked:bg-primary-500 [&>option]:checked:text-white"
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        backgroundImage: 'none'
                      }}
                    >
                      {INTERVIEW_TYPES.map(t => (
                        <option
                          key={t.value}
                          value={t.value}
                          className="bg-dark-200 text-white py-2 checked:bg-primary-500"
                          style={{ background: '#1a1a2e' }}
                        >
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="size-4 text-light-400" />
                    </div>
                  </div>
                </div>

                {/* 3. Visibility */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="flex items-center gap-1 bg-dark-300/30 p-1 rounded-lg border border-white/5 h-10">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={cn(
                        "flex-1 h-full text-xs rounded flex items-center justify-center gap-1.5 transition-all font-medium",
                        isPublic
                          ? "bg-primary-500/20 text-primary-200 shadow-sm border border-primary-400/30"
                          : "text-light-400 hover:text-white hover:bg-dark-200/50"
                      )}
                    >
                      <Globe className="size-3.5" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={cn(
                        "flex-1 h-full text-xs rounded flex items-center justify-center gap-1.5 transition-all font-medium",
                        !isPublic
                          ? "bg-dark-100 text-white shadow-sm border border-white/10"
                          : "text-light-400 hover:text-white hover:bg-dark-200/50"
                      )}
                    >
                      <Lock className="size-3.5" /> Private
                    </button>
                  </div>
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={stage === 'generating'} className="w-full h-14 text-lg btn-primary mt-6">
                {stage === 'generating' ? (
                  <><Loader2 className="animate-spin mr-2" /> Generating & Saving...</>
                ) : (
                  <><CheckCircle2 className="mr-2" /> Create Interview Template</>
                )}
              </Button>

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}