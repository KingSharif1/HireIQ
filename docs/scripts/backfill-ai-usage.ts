import { ensureHistoricalUsageBackfill } from '../../lib/ai/backfill-usage'

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx --env-file=.env.local docs/scripts/backfill-ai-usage.ts <userId>')
  process.exit(1)
}

ensureHistoricalUsageBackfill(userId)
  .then(inserted => {
    console.log(JSON.stringify({ inserted }))
  })
  .catch(err => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
