import type { Locale, Settings } from './types'

const NUMBER_LOCALES: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' }

export function formatMoney(amount: number, locale: Locale, settings: Pick<Settings, 'currencyLabel'>) {
  const n = new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    numberingSystem: 'latn',
  }).format(amount)
  const label = settings.currencyLabel[locale] || settings.currencyLabel.fr
  return locale === 'en' ? `${n} ${label}` : `${n} ${label}`
}

/** Rounds to cents to avoid floating point noise in totals. */
export const cents = (n: number) => Math.round(n * 100) / 100
