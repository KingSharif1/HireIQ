/**
 * Quick Anthropic API key diagnostic — run: node docs/scripts/test-anthropic-key.mjs
 * Does NOT print the key itself.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) {
    console.error('FAIL: .env.local not found')
    process.exit(1)
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

loadEnv()

const key = process.env.ANTHROPIC_API_KEY
if (!key) {
  console.error('FAIL: ANTHROPIC_API_KEY is not set in .env.local')
  process.exit(1)
}

console.log('ANTHROPIC_API_KEY: set (' + key.length + ' chars)')
console.log('Format check:', key.startsWith('sk-ant-') ? 'OK (sk-ant- prefix)' : 'WARN (unexpected prefix)')

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say hi' }],
  }),
})

const body = await res.text()
console.log('\nHTTP status:', res.status, res.statusText)

try {
  const json = JSON.parse(body)
  if (json.error) {
    console.log('API error type:', json.error.type)
    console.log('API error message:', json.error.message)
  } else if (json.content) {
    console.log('SUCCESS: API responded with content')
    console.log('Response:', json.content[0]?.text?.slice(0, 50))
  } else {
    console.log('Response body:', JSON.stringify(json, null, 2).slice(0, 500))
  }
} catch {
  console.log('Raw body:', body.slice(0, 500))
}
