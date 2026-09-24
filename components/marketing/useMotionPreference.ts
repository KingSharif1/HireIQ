'use client'

import { useSyncExternalStore } from 'react'
import { useReducedMotion } from 'framer-motion'

const subscribeNoop = () => () => {}

export function useMotionPreference() {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const prefersReducedMotion = useReducedMotion()
  return { mounted, reduceMotion: mounted && prefersReducedMotion === true }
}
