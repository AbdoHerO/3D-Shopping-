import { test } from '@playwright/test'
import { enterBoutique, goToShelf, tapProduct } from './helpers'

// Visual review: one picture per section of the shop, desktop and phone (npm run screenshots).
const SHELVES = ['counter', 'wall-hair', 'wall-nails', 'island', 'wall-skin', 'wall-makeup', 'wall-perfume']
const OUT = 'docs/screenshots'

test('boutique tour', async ({ page }, info) => {
  test.setTimeout(600_000)
  const p = info.project.name
  await page.addInitScript(() => localStorage.setItem('boutique.onboarded', '1'))
  await page.goto('/?tier=medium')
  await page.getByTestId('landing').waitFor()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${p}-01-street.png` })
  await page.goto('about:blank')
  await enterBoutique(page, 'medium')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${p}-02-entrance.png` })
  let i = 3
  for (const id of SHELVES) {
    await goToShelf(page, id)
    await page.screenshot({ path: `${OUT}/${p}-${String(i++).padStart(2, '0')}-${id}.png` })
  }
  await goToShelf(page, 'wall-makeup')
  await tapProduct(page, 'rouge-a-levres-satin', 'framboise')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${p}-${String(i++).padStart(2, '0')}-product.png` })
  await page.getByTestId('add-to-cart').click()
  await page.waitForTimeout(1200)
  await page.getByTestId('cart-button').click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${p}-${String(i).padStart(2, '0')}-basket.png` })
})
