'use client'

import { create } from 'zustand'
import type { StructuredResume, JobExtractedData, ATSScore, GapQuestion, GapAnalysis, CoverLetterResult, Resume, Job } from '@/types'

type TailorStep = 1 | 2 | 3 | 4 | 5

interface TailorFlowState {
  step: TailorStep
  selectedResume: Resume | null
  selectedJob: Job | null
  atsScore: ATSScore | null
  gapAnalysis: GapAnalysis | null
  questions: GapQuestion[]
  answers: Record<string, string>
  tailoredResumeId: string | null
  tailoredData: StructuredResume | null
  originalData: StructuredResume | null
  coverLetter: CoverLetterResult | null
  isGenerating: boolean
}

interface TailorFlowActions {
  setStep: (step: TailorStep) => void
  setSelectedResume: (resume: Resume | null) => void
  setSelectedJob: (job: Job | null) => void
  setATSScore: (score: ATSScore) => void
  setGapAnalysis: (analysis: GapAnalysis | null) => void
  setQuestions: (questions: GapQuestion[]) => void
  setAnswer: (questionId: string, answer: string) => void
  setTailoredResumeId: (id: string) => void
  setTailoredData: (data: StructuredResume) => void
  setOriginalData: (data: StructuredResume) => void
  setCoverLetter: (cl: CoverLetterResult) => void
  setIsGenerating: (val: boolean) => void
  resetTailorFlow: () => void
}

const initialTailorState: TailorFlowState = {
  step: 1,
  selectedResume: null,
  selectedJob: null,
  atsScore: null,
  gapAnalysis: null,
  questions: [],
  answers: {},
  tailoredResumeId: null,
  tailoredData: null,
  originalData: null,
  coverLetter: null,
  isGenerating: false,
}

export const useAppStore = create<TailorFlowState & TailorFlowActions>((set) => ({
  ...initialTailorState,

  setStep: (step) => set({ step }),
  setSelectedResume: (resume) => set({ selectedResume: resume }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setATSScore: (score) => set({ atsScore: score }),
  setGapAnalysis: (analysis) => set({ gapAnalysis: analysis }),
  setQuestions: (questions) => set({ questions }),
  setAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),
  setTailoredResumeId: (id) => set({ tailoredResumeId: id }),
  setTailoredData: (data) => set({ tailoredData: data }),
  setOriginalData: (data) => set({ originalData: data }),
  setCoverLetter: (cl) => set({ coverLetter: cl }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  resetTailorFlow: () => set(initialTailorState),
}))
