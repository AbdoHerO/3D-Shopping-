// Dev helper: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs] [actions...]
import { chromium } from '@playwright/test'
const [, , url, out, w = '1440', h = '900', wait = '6000', ...actions] = process.argv
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
if (process.env.SKIP_ONBOARDING) await page.addInitScript(() => localStorage.setItem('boutique.onboarded', '1'))
await page.goto(url)
await page.waitForTimeout(+wait)
for (const a of actions) {
  const [kind, arg, arg2] = a.split('|')
  if (kind === 'click') await page.click(arg)
  if (kind === 'eval') await page.evaluate(arg)
  if (kind === 'print') console.log('PRINT', JSON.stringify(await page.evaluate(arg)))
  if (kind === 'wait') await page.waitForTimeout(+arg)
  if (kind === 'shot') await page.screenshot({ path: arg })
  if (kind === 'mouse') { const [x, y] = arg.split(',').map(Number); await page.mouse.click(x, y) }
  if (kind === 'drag') { const [x, y, dx, dy] = arg.split(',').map(Number); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up() }
}
await page.screenshot({ path: out })
console.error(logs.filter((l) => !l.includes('[vite]') && !l.includes('Download the React DevTools')).slice(0, 30).join('\n'))
await browser.close()
