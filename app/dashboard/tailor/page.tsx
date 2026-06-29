'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { TailorStepper } from '@/components/tailor/TailorStepper'
import { MatchScore } from '@/components/tailor/MatchScore'
import { QuestionFlow } from '@/components/tailor/QuestionFlow'
import { GapAnalysisSummary } from '@/components/tailor/GapAnalysisSummary'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Briefcase, Loader2, Sparkles, Plus, ArrowRight, UserCircle, Pencil } from 'lucide-react'
import Link from 'next/link'
import { resolveProfileData } from '@/lib/profile/data'
import { hasProfileContent } from '@/lib/profile/master'
import { profileCompleteness } from '@/lib/profile/sections'
import type { Resume, Job, Profile, ProfileData } from '@/types'

// Inner component that safely uses useSearchParams (must be inside Suspense)
function TailorFlowContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = useAppStore()

  const [resumes, setResumes] = useState<Resume[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [loadingScore, setLoadingScore] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preselectedJobId = searchParams.get('jobId')
  const stepParam = parseInt(searchParams.get('step') || '1') as 1 | 2 | 3 | 4
  const currentStep = store.step

  useEffect(() => {
    if (stepParam >= 1 && stepParam <= 4) {
      store.setStep(stepParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [resumeRes, jobRes, profileRes] = await Promise.all([
        supabase.from('resumes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
      ])

      const resumeList = resumeRes.data || []
      setResumes(resumeList)
      setJobs(jobRes.data || [])

      const latestStructured = resumeList[0]?.structured_data ?? null
      const resolved = resolveProfileData(profileRes.data, latestStructured)
      setProfileData(resolved)

      // Link FK for tailored_resumes — content comes from profile master.
      const linkResume = resumeList.find(r => r.is_primary) ?? resumeList[0]
      if (linkResume) store.setSelectedResume(linkResume)

      setLoadingData(false)

      if (preselectedJobId && jobRes.data) {
        const job = jobRes.data.find(j => j.id === preselectedJobId)
        if (job) {
          store.setSelectedJob(job)
          store.setStep(2)
        }
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleScoreStep() {
    if (!store.selectedJob) return
    setLoadingScore(true)
    setError(null)
    try {
      const res = await fetch('/api/tailor/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: store.selectedResume?.id,
          jobId: store.selectedJob.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      store.setATSScore(data.score)
      store.setStep(3)
      router.replace('/dashboard/tailor?step=3', { scroll: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate score')
    } finally {
      setLoadingScore(false)
    }
  }

  async function handleGenerateQuestions() {
    if (!store.selectedJob) return
    setLoadingQuestions(true)
    setError(null)
    try {
      const res = await fetch('/api/tailor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: store.selectedResume?.id,
          jobId: store.selectedJob.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      store.setGapAnalysis(data.gapAnalysis ?? null)
      store.setQuestions(data.questions ?? [])
      store.setStep(4)
      router.replace('/dashboard/tailor?step=4', { scroll: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function handleGenerate() {
    if (!store.selectedJob) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/tailor/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: store.selectedResume?.id,
          jobId: store.selectedJob.id,
          answers: store.answers,
          questions: store.questions.map(q => ({ id: q.id, question: q.question })),
          gapAnalysis: store.gapAnalysis,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      store.setTailoredResumeId(data.tailoredResumeId)
      // Job Hub is the single home for a job's documents.
      router.push(`/dashboard/jobs/${store.selectedJob.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tailor resume')
      setGenerating(false)
    }
  }

  if (generating) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-purple/15 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-brand-purple animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Tailoring Your Resume</h2>
        <p className="text-muted-foreground text-sm">AI is rewriting your resume to maximize your match score. This takes ~30 seconds.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground mb-4">Tailor Resume</h1>
        <TailorStepper currentStep={currentStep} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Confirm master profile */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Your profile</h2>
          <p className="text-sm text-muted-foreground">
            Tailoring uses your master profile. Edit it anytime — changes apply to the next tailor run.
          </p>
          {loadingData ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !profileData || !hasProfileContent(profileData) ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center space-y-3">
                <UserCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Your profile is empty</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild size="sm">
                    <Link href="/dashboard/resume/upload"><Plus className="w-4 h-4" />Upload Resume</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/dashboard/profile"><Pencil className="w-4 h-4" />Fill Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {profileData.personal.firstName} {profileData.personal.lastName}
                      </p>
                      {profileData.personal.headline && (
                        <p className="text-sm text-brand-purple mt-0.5">{profileData.personal.headline}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {profileCompleteness(profileData, resumes.length)}% complete
                    </Badge>
                  </div>
                  {profileData.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{profileData.summary}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="muted">{profileData.experience.length} roles</Badge>
                    <Badge variant="muted">{profileData.education.length} education</Badge>
                    <Badge variant="muted">{profileData.projects.length} projects</Badge>
                  </div>
                </CardContent>
              </Card>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/dashboard/profile"><Pencil className="w-4 h-4" />Edit profile before tailoring</Link>
              </Button>
              <Button
                onClick={() => {
                  store.setStep(2)
                  router.replace('/dashboard/tailor?step=2', { scroll: false })
                }}
                className="w-full"
              >
                Continue to job selection <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Select Job */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Select a job to target</h2>
          {jobs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center space-y-3">
                <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No jobs saved yet</p>
                <Button asChild size="sm">
                  <Link href="/dashboard/jobs"><Plus className="w-4 h-4" />Add Job</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => store.setSelectedJob(job)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      store.selectedJob?.id === job.id
                        ? 'border-brand-purple bg-brand-purple/5'
                        : 'border-border hover:border-brand-purple/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      {job.extracted_data?.seniority && (
                        <Badge variant="secondary">{job.extracted_data.seniority}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                disabled={!store.selectedJob || loadingScore}
                onClick={handleScoreStep}
                className="w-full"
              >
                {loadingScore
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Scoring…</>
                  : <>Check Match Score <ArrowRight className="w-4 h-4" /></>
                }
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 3: ATS Score */}
      {currentStep === 3 && store.atsScore && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Your current match score</h2>
          <Card>
            <CardContent className="p-6">
              <MatchScore score={store.atsScore} />
            </CardContent>
          </Card>
          <Button onClick={handleGenerateQuestions} disabled={loadingQuestions} className="w-full" size="lg">
            {loadingQuestions
              ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing gaps…</>
              : <><Sparkles className="w-4 h-4" />Analyze Gaps & Tailor</>
            }
          </Button>
        </div>
      )}

      {/* Step 4: Gap analysis + Q&A */}
      {currentStep === 4 && store.gapAnalysis && (
        <GapAnalysisSummary analysis={store.gapAnalysis} />
      )}

      {currentStep === 4 && store.questions.length > 0 && (
        <div className="space-y-4 mt-4">
          <div>
            <h2 className="font-semibold text-foreground">Answer a few questions</h2>
            <p className="text-sm text-muted-foreground mt-1">Only for gaps we couldn&apos;t resolve from your profile.</p>
          </div>
          <QuestionFlow
            questions={store.questions}
            answers={store.answers}
            onAnswer={store.setAnswer}
            onComplete={handleGenerate}
          />
        </div>
      )}

      {currentStep === 4 && store.questions.length === 0 && store.gapAnalysis && (
        <div className="space-y-4 text-center py-8">
          <p className="text-muted-foreground">Your resume already looks strong for this role!</p>
          <Button onClick={handleGenerate} disabled={generating} size="lg">
            <Sparkles className="w-4 h-4" />Generate Tailored Resume
          </Button>
        </div>
      )}
    </div>
  )
}

// Suspense wrapper is required for useSearchParams() in Next.js App Router
export default function TailorPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    }>
      <TailorFlowContent />
    </Suspense>
  )
}
