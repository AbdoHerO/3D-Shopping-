import { expect, test } from '@playwright/test'
import { enterBoutique, goToShelf, tapProduct } from './helpers'

test('walk in, tap a shade on the shelf and send the order by WhatsApp', async ({ page }) => {
  await enterBoutique(page)
  await goToShelf(page, 'stand-nails')
  await tapProduct(page, 'vernis-pastel', 'menthe')

  const sheet = page.getByTestId('product-sheet')
  await expect(sheet).toContainText('Vernis Collection pastel')
  await expect(sheet).toContainText('Menthe')
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('toast').first()).toContainText('Vernis Collection pastel')
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  await page.getByTestId('cart-button').click()
  await expect(page.getByTestId('cart-lines')).toContainText('Menthe')
  await page.getByTestId('checkout-button').click()

  // validation first
  await page.getByTestId('place-order').click()
  await expect(page.getByTestId('checkout-form')).toContainText('Ce champ est obligatoire')

  await page.getByTestId('field-name').fill('Salma Bennani')
  await page.getByTestId('field-phone').fill('06 12 34 56 78')
  await page.getByTestId('field-city').selectOption('casablanca')
  await page.getByTestId('field-address').fill('12 rue des Lilas, Maarif, 3e étage')
  await page.getByTestId('field-consent').check()
  await expect(page.getByTestId('order-total')).toContainText('60')
  await page.getByTestId('place-order').click()

  await expect(page.getByTestId('order-confirmation')).toBeVisible()
  await expect(page.getByTestId('order-number')).toContainText(/ML-\d{6}-[A-Z0-9]{4}/)
  const href = await page.getByTestId('whatsapp-link').getAttribute('href')
  expect(href).toContain('https://wa.me/212600000000?text=')
  const message = decodeURIComponent(href!.split('text=')[1])
  expect(message).toContain('1 × Vernis Collection pastel — Menthe')
  expect(message).toContain('Casablanca')
  expect(message).toContain('+212612345678')
  expect(message).toContain('paiement à la livraison')
})

test('a shared product link opens it on its shelf, with sizes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('boutique.onboarded', '1'))
  await page.goto('/?tier=low&product=edp-rose-de-damas')
  const sheet = page.getByTestId('product-sheet')
  await expect(sheet).toContainText('Rose de Damas')
  await expect(sheet).toContainText('349')
  await sheet.getByRole('radio', { name: /100 ml/ }).click()
  await expect(sheet).toContainText('549')
})

test('free walking moves the camera and keeps it inside the shop', async ({ page }) => {
  await enterBoutique(page)
  await page.getByTestId('walk-toggle').click()
  const before = await page.evaluate(() => (window as unknown as { __boutique: { rig: { pos: { z: number } } } }).__boutique.rig.pos.z)
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(2500)
  await page.keyboard.up('ArrowUp')
  const after = await page.evaluate(() => {
    const r = (window as unknown as { __boutique: { rig: { pos: { x: number; z: number } } } }).__boutique.rig
    return { x: r.pos.x, z: r.pos.z }
  })
  expect(after.z).toBeLessThan(before - 0.3)
  expect(Math.abs(after.x)).toBeLessThan(1.75)
  expect(after.z).toBeGreaterThan(-6.5)
})

test('catalog: search, filter and add to the basket', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('catalog-search').fill('argan')
  const cards = page.getByTestId('catalog-card')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(2)
  await cards.first().getByRole('button', { name: /Ajouter au panier/ }).click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')
})

test('Arabic switches the interface to right-to-left', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('language').filter({ visible: true }).first().selectOption('ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('جميع المنتجات')
})
