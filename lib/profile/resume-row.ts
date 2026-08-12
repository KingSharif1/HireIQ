import type { Resume } from '@/types'

export type ResumeRow = Pick<
  Resume,
  'id' | 'title' | 'ats_format_score' | 'is_primary' | 'created_at' | 'original_file_url'
>
