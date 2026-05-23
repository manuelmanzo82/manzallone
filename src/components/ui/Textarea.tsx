'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-warm-800 dark:text-warm-200"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-xl border bg-white px-4 py-3 text-base text-warm-900 placeholder:text-warm-400',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'dark:bg-warm-900 dark:text-warm-50 dark:placeholder:text-warm-500',
            'min-h-[88px] resize-y',
            error
              ? 'border-danger-500 dark:border-danger-500'
              : 'border-warm-300 dark:border-warm-700',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-warm-500 dark:text-warm-400">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-danger-600 dark:text-danger-400">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
