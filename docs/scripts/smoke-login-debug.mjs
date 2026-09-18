import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

export default async function (page) {
  const BASE = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(env.TEST_USER_EMAIL)
  await page.locator('input[type="password"]').fill(env.TEST_USER_PASSWORD)
  await page.getByRole('button', { name: /^Sign in$/i }).click()
  await page.waitForTimeout(5000)
  const url = page.url()
  const body = (await page.locator('body').innerText()).slice(0, 800)
  const alerts = await page.locator('[role="alert"], .text-destructive, .text-red-500').allTextContents().catch(() => [])
  return { url, alerts, body }
}
