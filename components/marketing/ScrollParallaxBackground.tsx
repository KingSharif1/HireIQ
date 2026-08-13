'use client'

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Creative scroll backdrop: aurora, perspective grid, constellation paths,
 * traveling spotlight, floating resume sheets. Transform/SVG only.
 */
export function ScrollParallaxBackground({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const z = (v: number) => (reduce ? 0 : v)

  const auroraY = useTransform(scrollYProgress, [0, 1], [0, z(220)])
  const auroraX = useTransform(scrollYProgress, [0, 1], [0, z(-80)])
  const auroraScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.12, 0.95])
  const hue = useTransform(scrollYProgress, [0, 1], [0, z(38)])
  const auroraFilter = useTransform(hue, v => (reduce ? 'none' : `hue-rotate(${v}deg)`))

  const aurora2Y = useTransform(scrollYProgress, [0, 1], [0, z(-160)])

  const gridY = useTransform(scrollYProgress, [0, 1], [0, z(420)])
  const gridOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.16, 0.11, 0.08, 0.04])

  const spotY = useTransform(scrollYProgress, [0, 1], ['10%', '82%'])
  const spotOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.3, 0.55, 0.4, 0.18])

  const sheet1Y = useTransform(scrollYProgress, [0, 1], [0, z(-200)])
  const sheet1R = useTransform(scrollYProgress, [0, 1], [-10, z(8)])
  const sheet2Y = useTransform(scrollYProgress, [0, 1], [0, z(260)])
  const sheet2R = useTransform(scrollYProgress, [0, 1], [12, z(-6)])
  const sheet3Y = useTransform(scrollYProgress, [0, 1], [0, z(-340)])
  const sheet3R = useTransform(scrollYProgress, [0, 1], [-6, z(14)])

  const path1 = useTransform(scrollYProgress, [0, 0.42], [0.04, 1])
  const path2 = useTransform(scrollYProgress, [0.12, 0.62], [0.04, 1])
  const constellationY = useTransform(scrollYProgress, [0, 1], [0, z(150)])

  const ring1Scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.82, 1.05, 1.22])
  const ring1Opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.12, 0.32, 0.22, 0.08])
  const ring2Scale = useTransform(scrollYProgress, [0, 1], [0.7, reduce ? 0.7 : 1.35])
  const ring2Opacity = useTransform(scrollYProgress, [0, 0.4, 1], [0.1, 0.2, 0.05])

  const dots = [
    [120, 180],
    [420, 160],
    [700, 200],
    [920, 260],
    [280, 560],
    [720, 580],
    [180, 820],
    [540, 760],
    [860, 880],
  ] as const

  const d0 = useTransform(scrollYProgress, [0, 0.12], [0.25, 1])
  const d1 = useTransform(scrollYProgress, [0.04, 0.18], [0.25, 1])
  const d2 = useTransform(scrollYProgress, [0.08, 0.24], [0.25, 1])
  const d3 = useTransform(scrollYProgress, [0.12, 0.3], [0.25, 1])
  const d4 = useTransform(scrollYProgress, [0.2, 0.4], [0.25, 1])
  const d5 = useTransform(scrollYProgress, [0.28, 0.48], [0.25, 1])
  const d6 = useTransform(scrollYProgress, [0.4, 0.6], [0.25, 1])
  const d7 = useTransform(scrollYProgress, [0.48, 0.68], [0.25, 1])
  const d8 = useTransform(scrollYProgress, [0.55, 0.78], [0.25, 1])
  const dotOpacity = [d0, d1, d2, d3, d4, d5, d6, d7, d8]

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-[#070f1a]" />

      <motion.div
        style={{ y: auroraY, x: auroraX, scale: auroraScale, filter: auroraFilter }}
        className="absolute -left-[22%] -top-[12%] h-[75vmax] w-[75vmax]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(45,212,191,0.38),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(56,189,248,0.2),transparent_50%),radial-gradient(circle_at_45%_85%,rgba(13,148,136,0.25),transparent_48%)] blur-2xl" />
      </motion.div>

      <motion.div style={{ y: aurora2Y }} className="absolute -right-[18%] top-[32%] h-[58vmax] w-[58vmax]">
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(20,184,166,0.22),transparent_58%),radial-gradient(circle_at_78%_22%,rgba(165,243,252,0.1),transparent_45%)] blur-3xl" />
      </motion.div>

      <motion.div style={{ y: gridY, opacity: gridOpacity }} className="absolute -inset-y-[45%] inset-x-0">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(125,211,252,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.07) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            transform: 'perspective(700px) rotateX(58deg)',
            transformOrigin: 'center top',
            maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 65%, transparent)',
          }}
        />
      </motion.div>

      <motion.div
        style={{ top: spotY, opacity: spotOpacity }}
        className="absolute left-1/2 h-[44vmax] w-[44vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.18),transparent_64%)] blur-2xl"
      />

      <motion.div
        style={{ scale: ring1Scale, opacity: ring1Opacity }}
        className="absolute left-1/2 top-[20%] h-[min(72vw,540px)] w-[min(72vw,540px)] -translate-x-1/2 rounded-full border border-teal-300/25"
      />
      <motion.div
        style={{ scale: ring2Scale, opacity: ring2Opacity }}
        className="absolute left-[14%] top-[52%] h-[min(52vw,400px)] w-[min(52vw,400px)] rounded-full border border-cyan-200/15"
      />

      <motion.svg
        viewBox="0 0 1000 1200"
        className="absolute inset-0 h-full w-full"
        style={{ y: constellationY }}
        preserveAspectRatio="xMidYMid slice"
      >
        <motion.path
          d="M120 180 C 260 220, 300 80, 420 160 S 620 280, 700 200 S 880 120, 920 260"
          fill="none"
          stroke="rgba(45,212,191,0.4)"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ pathLength: reduce ? 1 : path1 }}
        />
        <motion.path
          d="M80 520 C 200 480, 280 620, 420 560 S 600 480, 720 580 S 900 640, 960 520"
          fill="none"
          stroke="rgba(125,211,252,0.28)"
          strokeWidth="1.1"
          strokeLinecap="round"
          style={{ pathLength: reduce ? 1 : path2 }}
        />
        {dots.map(([cx, cy], i) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={i % 3 === 0 ? 3.4 : 2.3}
            fill={i % 2 === 0 ? 'rgba(45,212,191,0.65)' : 'rgba(165,243,252,0.45)'}
            style={{ opacity: reduce ? 0.7 : dotOpacity[i] }}
          />
        ))}
      </motion.svg>

      <FloatingSheet
        className="left-[5%] top-[16%] hidden w-[118px] sm:block md:left-[7%] md:w-[148px]"
        y={sheet1Y}
        rotate={sheet1R}
        delay={0}
        reduce={!!reduce}
      />
      <FloatingSheet
        className="right-[4%] top-[40%] hidden w-[108px] sm:block md:right-[6%] md:w-[138px]"
        y={sheet2Y}
        rotate={sheet2R}
        delay={1.1}
        reduce={!!reduce}
      />
      <FloatingSheet
        className="left-[10%] top-[66%] hidden w-[100px] md:block md:w-[128px]"
        y={sheet3Y}
        rotate={sheet3R}
        delay={2}
        reduce={!!reduce}
      />

      <div className="marketing-grain opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,15,26,0.2),transparent_22%,transparent_58%,rgba(7,15,26,0.82))]" />
    </div>
  )
}

function FloatingSheet({
  className,
  y,
  rotate,
  delay,
  reduce,
}: {
  className?: string
  y: MotionValue<number>
  rotate: MotionValue<number>
  delay: number
  reduce: boolean
}) {
  return (
    <motion.div style={{ y, rotate }} className={cn('absolute', className)}>
      <motion.div
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={
          reduce ? undefined : { duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }
        }
        className="rounded-lg border border-white/15 bg-[#eef2f6]/92 p-2.5 shadow-2xl shadow-black/45 backdrop-blur-[2px]"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[7px] font-semibold uppercase tracking-wider text-teal-700">
            HireIQ
          </span>
          <span className="h-1 w-6 rounded-full bg-teal-500/45" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-3/4 rounded-full bg-slate-800/15" />
          <div className="h-1 w-full rounded-full bg-slate-800/10" />
          <div className="h-1 w-5/6 rounded-full bg-slate-800/10" />
          <div className="mt-1.5 h-1 w-full rounded-full bg-teal-600/30" />
          <div className="h-1 w-2/3 rounded-full bg-teal-600/20" />
        </div>
      </motion.div>
    </motion.div>
  )
}
