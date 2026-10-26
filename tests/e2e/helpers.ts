import { expect, type Page } from '@playwright/test'

type Hooks = {
  rig: { mode: string; vp: { id: string } | null; pos: { x: number; z: number } }
  settled: () => boolean
  project: (productId: string, variantId?: string | null) => { x: number; y: number } | null
  goToFixture: (id: string) => void
}

export const hooks = (page: Page) => page.evaluateHandle(() => (window as unknown as { __boutique: Hooks }).__boutique)

/** Opens the boutique and walks in past the street intro (onboarding pre-dismissed). */
export async function enterBoutique(page: Page, tier: 'low' | 'medium' | 'high' = 'low') {
  await page.addInitScript(() => localStorage.setItem('boutique.onboarded', '1'))
  await page.goto(`/?tier=${tier}`)
  await expect(page.getByTestId('landing')).toBeVisible()
  await page.getByTestId('enter').click()
  await expect(page.getByTestId('zone-entrance')).toBeVisible()
  await page.waitForFunction(() => (window as unknown as { __boutique?: Hooks }).__boutique?.rig.mode === 'guided')
  await settle(page)
}

/**
 * Waits until the camera has finished its glide and caught up with its target. Glides are tweened,
 * and on software WebGL a frame can take longer than any fixed delay, so the scene reports it.
 */
export async function settle(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __boutique?: Hooks }).__boutique?.settled() === true, undefined, { polling: 250 })
}

export async function goToShelf(page: Page, id: string) {
  await page.getByTestId(`zone-${id}`).click()
  await page.waitForFunction(
    (fid) => {
      const r = (window as unknown as { __boutique?: Hooks }).__boutique?.rig
      return r?.mode === 'guided' && r.vp?.id === fid
    },
    id,
  )
  await settle(page)
}

export async function tapProduct(page: Page, productId: string, variantId: string | null = null) {
  const pos = await page.evaluate(
    ([p, v]) => (window as unknown as { __boutique: Hooks }).__boutique.project(p as string, v),
    [productId, variantId] as const,
  )
  expect(pos, `${productId} should be on screen`).not.toBeNull()
  await page.mouse.click(pos!.x, pos!.y)
}
