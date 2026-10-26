import { expect, test } from '@playwright/test'

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
  const number = (await page.getByTestId('order-number').textContent())!.match(/ML-\d{6}-\w{4}/)![0]

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
  await expect(page).toHaveURL(/\/admin\/products$/)

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
