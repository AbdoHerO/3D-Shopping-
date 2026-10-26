import type { I18nText, Locale } from './types'

/** Picks the right translation, falling back to French, then to any non-empty value. */
export function tr(text: I18nText | null | undefined, locale: Locale): string {
  if (!text) return ''
  return text[locale] || text.fr || text.en || text.ar || ''
}

export function isRtl(locale: Locale) {
  return locale === 'ar'
}
