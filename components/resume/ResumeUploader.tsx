'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MAX_RESUME_UPLOAD_BYTES,
  MAX_RESUME_UPLOAD_LABEL,
} from '@/lib/resume/extract-text'

interface ResumeUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function ResumeUploader({ onFileSelect, disabled }: ResumeUploaderProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setDragError(null)

    if (rejectedFiles && (rejectedFiles as Array<{errors: Array<{code: string}>}>).length > 0) {
      const errs = (rejectedFiles as Array<{errors: Array<{code: string}>}>)[0].errors
      if (errs[0]?.code === 'file-too-large') {
        setDragError(`File is too large. Max ${MAX_RESUME_UPLOAD_LABEL}.`)
      } else if (errs[0]?.code === 'file-invalid-type') {
        setDragError('Only PDF and DOCX files are accepted.')
      } else {
        setDragError('Invalid file.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_RESUME_UPLOAD_BYTES,
    maxFiles: 1,
    disabled,
  })

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive && !isDragReject && 'border-brand-purple bg-brand-purple/5',
          isDragReject && 'border-destructive bg-destructive/5',
          !isDragActive && !isDragReject && 'border-border hover:border-brand-purple/50 hover:bg-brand-purple/5',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
            isDragActive ? 'bg-brand-purple/20' : 'bg-secondary'
          )}>
            {isDragActive ? (
              <FileText className="w-7 h-7 text-brand-purple" />
            ) : (
              <Upload className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isDragActive ? 'Drop it here' : 'Drag & drop your resume'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF or DOCX · Max {MAX_RESUME_UPLOAD_LABEL} · scans OK ·{' '}
              <span className="text-primary">browse files</span>
            </p>
          </div>
        </div>
      </div>

      {dragError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {dragError}
        </div>
      )}
    </div>
  )
}
