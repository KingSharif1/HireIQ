export type TailorUserError = {
  title: string
  message: string
  canRetry: boolean
}

export function userFacingTailorError(raw: string | null | undefined): TailorUserError {
  const text = (raw ?? '').trim()
  if (!text) {
    return {
      title: 'Something went wrong',
      message: 'We couldn’t finish this version. Try again — your profile wasn’t changed.',
      canRetry: true,
    }
  }

  if (/already running|in flight|will not start another/i.test(text)) {
    return {
      title: 'Still working',
      message: 'This tailor is already running in the background. Come back in a moment.',
      canRetry: false,
    }
  }

  if (/credit|billing|quota|rate_limit|too many requests|402/i.test(text)) {
    return {
      title: 'Out of AI credits',
      message:
        'We couldn’t complete this tailor because the AI account is out of credits or was rate-limited. Add your own key in Settings → AI, or try again later.',
      canRetry: true,
    }
  }

  if (/network|fetch failed|ECONNRESET|ETIMEDOUT|Failed to fetch|aborted/i.test(text)) {
    return {
      title: 'Connection dropped',
      message: 'The network hiccuped. Your progress is saved — try again.',
      canRetry: true,
    }
  }

  if (/model.*deprecated|model_not_found|invalid.*model|^model:/i.test(text)) {
    return {
      title: 'That model isn’t available',
      message: 'Pick another model in Settings → AI, then try again.',
      canRetry: true,
    }
  }

  if (/JSON|Unexpected token|Expected ','|Expected '"'|position \d+/i.test(text)) {
    return {
      title: 'Couldn’t finish this step',
      message: 'We hit a snag reviewing this job. Try again — your profile wasn’t changed.',
      canRetry: true,
    }
  }

  if (/did not finish|stale|took too long/i.test(text)) {
    return {
      title: 'This took too long',
      message: 'We stopped waiting so you aren’t stuck. Try again when you’re ready.',
      canRetry: true,
    }
  }

  if (/not configured|API key|AiConfig/i.test(text)) {
    return {
      title: 'AI isn’t set up',
      message: 'Add an API key in Settings → AI, then try again.',
      canRetry: true,
    }
  }

  return {
    title: 'Couldn’t finish this version',
    message: text.length > 220 ? `${text.slice(0, 200).trim()}…` : text,
    canRetry: true,
  }
}
