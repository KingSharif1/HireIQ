'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMotionPreference } from '@/components/marketing/useMotionPreference'

export function ScrollParallaxBackground({ className }: { className?: string }) {
  const { reduceMotion: reduce } = useMotionPreference()
  const { scrollYProgress } = useScroll()

  const contourY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])
  const routeY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 32])

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-background" />

      <motion.svg
        viewBox="0 0 800 800"
        style={{ y: contourY }}
        className="absolute -right-[18%] -top-[10%] h-[78vmax] w-[78vmax] text-primary opacity-[0.1]"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        <path
          d="M400 74 C 520 82, 640 150, 692 268 C 744 386, 726 522, 640 612 C 554 702, 414 736, 300 692 C 186 648, 102 540, 96 414 C 90 288, 158 172, 268 118 C 310 98, 352 82, 400 74 Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M398 150 C 492 158, 580 212, 620 302 C 660 392, 646 494, 580 560 C 514 626, 410 652, 322 616 C 234 580, 168 496, 164 400 C 160 304, 212 216, 296 176 C 328 160, 362 152, 398 150 Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M402 230 C 468 236, 532 276, 560 340 C 588 404, 578 478, 532 528 C 486 578, 412 596, 348 570 C 284 544, 238 482, 236 410 C 234 338, 272 272, 334 244 C 356 234, 378 230, 402 230 Z"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <path
          d="M400 306 C 442 310, 482 336, 500 374 C 518 412, 512 458, 486 488 C 460 518, 416 528, 380 512 C 344 496, 318 460, 318 420 C 318 380, 342 342, 378 322 C 384 318, 392 310, 400 306 Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="400" cy="412" r="7" stroke="currentColor" strokeWidth="1.4" />
      </motion.svg>

      <motion.svg
        viewBox="0 0 1200 360"
        style={{ y: routeY }}
        className="absolute -left-[8%] bottom-[6%] h-[46vmax] w-[80vmax] text-primary opacity-[0.14]"
        preserveAspectRatio="xMidYMax meet"
        fill="none"
      >
        <path
          d="M40 300 L300 300 L368 232 L640 232 L708 164 L900 164 L968 96 L1160 96"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {[
          [300, 300],
          [640, 232],
          [900, 164],
          [1160, 96],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="11" stroke="currentColor" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="3.5" fill="currentColor" />
          </g>
        ))}
      </motion.svg>

      <div className="marketing-grain opacity-30 dark:opacity-20" />
    </div>
  )
}
