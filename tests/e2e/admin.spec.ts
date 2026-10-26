import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test('admin (demo mode): manage an order and change a price the shop then shows', async ({ page }) => {
  // a customer orders from the list view
  await page.goto('/catalog')
  await page.getByTestId('catalog-search').fill('Shampooing nourrissant')
  await page.getByTestId('catalog-card').first().getByRole('button', { name: /Ajouter au panier/ }).click()
  await page.getByTestId('cart-button').click()
  await page.getByTestId('checkout-button').click()
  await page.getByTestId('field-name').fill('Imane Alaoui')
  await page.getByTestId('field-phone').fill('0661234567')
  await page.getByTestId('field-city').selectOption('marrakech')
  await page.getByTestId('field-address').fill('Riad 9, Derb Sidi Bouloukat')
  await page.getByTestId('field-consent').check()
  await page.getByTestId('place-order').click()
  const number = (await page.getByTestId('order-number').textContent())!.match(/TF-\d{6}-\w{4}/)![0]

  // the owner sees it and confirms it
  await page.goto('/admin')
  await expect(page.getByTestId('demo-banner')).toBeVisible()
  await page.getByRole('link', { name: 'Commandes' }).click()
  await page.getByRole('cell', { name: number }).click()
  await expect(page.getByText('Riad 9, Derb Sidi Bouloukat, Marrakech')).toBeVisible()
  await page.getByTestId('order-status').selectOption('confirmed')
  await expect(page.getByRole('status')).toHaveText('Enregistré')

  // and changes a price
  await page.goto('/admin/products/shampooing-argan')
  await page.getByLabel('Prix', { exact: true }).fill('95')
  await page.getByTestId('save-product').click()
  await expect(page.getByRole('status')).toHaveText('Enregistré')

  await page.goto('/catalog')
  await page.getByTestId('catalog-search').fill('Shampooing nourrissant')
  await expect(page.getByTestId('catalog-card').first()).toContainText('95 DH')
})

test('admin (demo mode): shelf editor shows every fixture at scale', async ({ page }) => {
  await page.goto('/admin/placement')
  await expect(page.locator('svg image').first()).toBeVisible()
  const count = await page.locator('svg image').count()
  expect(count).toBeGreaterThan(20)
  await page.locator('svg image').nth(3).click()
  await expect(page.getByRole('button', { name: /Vers la droite/ })).toBeVisible()
})

test('admin (demo mode): a new product with a photo is prepared in 3D, placed and sold', async ({ page }, info) => {
  // a lipstick photographed on a white background (synthetic, made here)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600"><rect width="300" height="600" fill="#fff"/>
    <rect x="115" y="260" width="70" height="300" rx="6" fill="#1d1a1c"/><rect x="125" y="140" width="50" height="125" fill="#c9a46a"/>
    <path d="M128 140 L128 70 Q150 40 172 90 L172 140 Z" fill="#b0313f"/></svg>`
  const file = info.outputPath('lipstick.jpg')
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(file)

  await page.goto('/admin/products/new')
  await page.locator('input.field').first().fill('Rouge à lèvres Essai')
  await page.getByLabel('Prix', { exact: true }).fill('59')
  await page.getByLabel('Catégorie').selectOption('makeup')
  await page.getByTestId('photo-input').setInputFiles(file)
  await expect(page.locator('img[src^="blob:"]')).toBeVisible()
  await page.getByTestId('save-product').click()
  await expect(page).toHaveURL(/\/admin\/products$/)

  // the job runs after saving: the list shows its state until it is prepared
  const row = page.locator('li', { hasText: 'Rouge à lèvres Essai' })
  await expect(row.locator('[data-status]')).toHaveAttribute('data-status', /ready|review/, { timeout: 30_000 })
  await row.getByRole('link').click()
  await expect(page.getByTestId('model-preview')).toBeVisible()
  await expect(page.getByTestId('family-select')).toContainText('Rouge à lèvres')
  await expect(page.getByTestId('model-provider')).toContainText('non configurée')

  // it stands on a shelf in the shop and sells like any other product
  await page.addInitScript(() => localStorage.setItem('boutique.onboarded', '1'))
  await page.goto('/?tier=low&product=rouge-a-levres-essai')
  const sheet = page.getByTestId('product-sheet')
  await expect(sheet).toContainText('Rouge à lèvres Essai')
  await expect(sheet).toContainText('59')
  await page.getByTestId('add-to-cart').click()
  await expect(page.getByTestId('cart-count')).toHaveText('1')
})

test('admin (demo mode): a photo that cannot be used is refused before upload', async ({ page }, info) => {
  const file = info.outputPath('small.jpg')
  // a real image, but only 60 × 80 pixels: too small to show on a shelf
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80"><defs><linearGradient id="g"><stop offset="0" stop-color="#c33"/><stop offset="1" stop-color="#36c"/></linearGradient></defs><rect width="60" height="80" fill="url(#g)"/></svg>`
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(file)
  await page.goto('/admin/products/new')
  await page.getByTestId('photo-input').setInputFiles(file)
  await expect(page.getByTestId('photo-error')).toContainText('120')
})

