'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with the text so long content is fully visible. Default on. */
  autoGrow?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = true, onChange, onInput, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref]
    )

    const grow = React.useCallback(() => {
      const el = innerRef.current
      if (!el || !autoGrow) return
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
    }, [autoGrow])

    React.useLayoutEffect(() => {
      grow()
    }, [grow, value])

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors',
          autoGrow && 'overflow-hidden',
          className
        )}
        ref={setRefs}
        value={value}
        onChange={event => {
          onChange?.(event)
          if (autoGrow) {
            const el = event.currentTarget
            el.style.height = '0px'
            el.style.height = `${el.scrollHeight}px`
          }
        }}
        onInput={event => {
          onInput?.(event)
          if (autoGrow) grow()
        }}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
