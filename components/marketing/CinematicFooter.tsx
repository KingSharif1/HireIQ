'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useMotionPreference } from '@/components/marketing/useMotionPreference'

export function CinematicFooter() {
  const { mounted, reduceMotion: reduce } = useMotionPreference()
  const showVideo = mounted && !reduce
  const footerRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playedRef = useRef(false)

  useEffect(() => {
    if (!showVideo) return
    const footer = footerRef.current
    const video = videoRef.current
    if (!footer || !video) return
    const observer = new IntersectionObserver(
      entries => {
        if (playedRef.current || !entries.some(entry => entry.isIntersecting)) return
        playedRef.current = true
        video.currentTime = 0
        void video.play().catch(() => undefined)
        observer.disconnect()
      },
      { threshold: 0.25 },
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [showVideo])

  return (
    <footer
      ref={footerRef}
      className="relative z-10 -mt-24 flex min-h-[420px] flex-col overflow-hidden pt-24 md:min-h-[520px]"
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_100%)]">
        <div aria-hidden className="absolute inset-0 bg-[var(--mk-deep)]">
          <div className="ink-hatch absolute inset-0 opacity-60" />
          <div className="absolute -left-[4%] bottom-[18%] h-40 w-64 -rotate-6 rounded-xl border border-border bg-[var(--mk-panel)] p-4 shadow-[5px_5px_0_hsl(var(--ink-shadow)/0.12)] sm:h-48 sm:w-80">
            <div className="h-2.5 w-1/3 rounded-full bg-foreground/20" />
            <div className="mt-3 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-foreground/10" />
              <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
              <div className="h-1.5 w-2/3 rounded-full bg-primary/30" />
            </div>
          </div>
          <div className="absolute -right-[3%] top-[16%] h-36 w-56 rotate-[5deg] rounded-xl border border-border bg-[var(--mk-panel)] p-4 shadow-[5px_5px_0_hsl(var(--ink-shadow)/0.12)] sm:h-44 sm:w-72">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full border border-primary/50" />
              <div className="h-2 w-1/2 rounded-full bg-foreground/15" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-foreground/10" />
              <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
            </div>
          </div>
        </div>

        {showVideo && (
          <video
            ref={videoRef}
            muted
            playsInline
            preload="metadata"
            poster="/marketing/hireiq-footer-poster.webp"
            aria-hidden
            tabIndex={-1}
            onLoadedMetadata={event => {
              event.currentTarget.playbackRate = 0.75
            }}
            onTimeUpdate={event => {
              if (event.currentTarget.currentTime >= 3.5) event.currentTarget.pause()
            }}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/marketing/hireiq-footer.mp4" type="video/mp4" />
          </video>
        )}

        <div aria-hidden className="absolute inset-0 bg-background/55" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-6 pt-20 md:px-6 md:pt-24">
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <a href="#how" className="font-medium text-foreground/80 transition hover:text-foreground">
            Product
          </a>
          <Link href="/privacy" className="font-medium text-foreground/80 transition hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="font-medium text-foreground/80 transition hover:text-foreground">
            Terms
          </Link>
          <Link href="/login" className="font-medium text-foreground/80 transition hover:text-foreground">
            Sign in
          </Link>
        </nav>

        <div className="mt-auto">
          <p
            aria-hidden
            className="font-display select-none text-[clamp(4.5rem,19vw,15rem)] font-bold leading-[0.8] tracking-tight text-foreground"
          >
            HireIQ
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-foreground/20 pt-4 text-xs text-muted-foreground sm:justify-between">
            <span>© {new Date().getFullYear()} HireIQ</span>
            <span className="sm:flex-1 sm:text-center">Made with ❤️ in Texas.</span>
            <span>Tailor, auto-apply, and track every job.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
