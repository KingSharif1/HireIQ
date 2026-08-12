'use client'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { ReactNode } from 'react'

export type WorkspacePanel = 'score' | 'keywords' | 'changes' | 'questions' | 'details'

interface WorkspaceShellProps {
  scoreLabel?: string
  pendingChanges?: number
  questionCount?: number
  defaultPanel?: WorkspacePanel
  scorePanel: ReactNode
  keywordsPanel: ReactNode
  changesPanel: ReactNode
  questionsPanel: ReactNode
  detailsPanel?: ReactNode
  preview: ReactNode
  toolbar?: ReactNode
}

/**
 * Teal-style split: analysis panels (left) + always-visible resume preview (right).
 * Stacks on mobile — panels first, preview below.
 */
export function WorkspaceShell({
  scoreLabel,
  pendingChanges = 0,
  questionCount = 0,
  defaultPanel = 'score',
  scorePanel,
  keywordsPanel,
  changesPanel,
  questionsPanel,
  detailsPanel,
  preview,
  toolbar,
}: WorkspaceShellProps) {
  return (
    <div className="flex flex-col gap-4 min-h-0">
      {toolbar}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start min-h-0">
        {/* Analysis rail */}
        <div className="w-full lg:w-[min(100%,420px)] lg:flex-shrink-0 order-1">
          <Tabs defaultValue={defaultPanel} className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 justify-start">
              <TabsTrigger value="score" className="text-xs sm:text-sm">
                Match Score
                {scoreLabel ? (
                  <Badge variant="muted" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {scoreLabel}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs sm:text-sm">
                Keywords
              </TabsTrigger>
              <TabsTrigger value="changes" className="text-xs sm:text-sm">
                Changes
                {pendingChanges > 0 ? (
                  <Badge variant="muted" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {pendingChanges}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="questions" className="text-xs sm:text-sm">
                Q&amp;A
                {questionCount > 0 ? (
                  <Badge variant="muted" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {questionCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
              {detailsPanel ? (
                <TabsTrigger value="details" className="text-xs sm:text-sm">
                  Job
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="score" className="mt-3">
              <PanelCard>{scorePanel}</PanelCard>
            </TabsContent>
            <TabsContent value="keywords" className="mt-3">
              <PanelCard>{keywordsPanel}</PanelCard>
            </TabsContent>
            <TabsContent value="changes" className="mt-3">
              <PanelCard className="p-0 sm:p-0 overflow-hidden">{changesPanel}</PanelCard>
            </TabsContent>
            <TabsContent value="questions" className="mt-3">
              <PanelCard>{questionsPanel}</PanelCard>
            </TabsContent>
            {detailsPanel ? (
              <TabsContent value="details" className="mt-3">
                <PanelCard>{detailsPanel}</PanelCard>
              </TabsContent>
            ) : null}
          </Tabs>
        </div>

        {/* Live preview — sticky on desktop */}
        <div
          className={cn(
            'flex-1 min-w-0 order-2',
            'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto'
          )}
        >
          {preview}
        </div>
      </div>
    </div>
  )
}

function PanelCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card/60 p-4 sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}
