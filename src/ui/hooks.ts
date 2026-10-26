import { useTranslation } from 'react-i18next'
import { formatMoney } from '@/lib/money'
import { tr } from '@/lib/i18n-text'
import type { I18nText, Locale } from '@/lib/types'
import { useCatalog } from '@/state/catalog'

/** Current locale plus helpers to translate catalog text and format prices. */
export function useLocale() {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as Locale) || 'fr'
  const settings = useCatalog((s) => s.catalog?.settings)
  return {
    t,
    locale,
    rtl: locale === 'ar',
    text: (v: I18nText | null | undefined) => tr(v, locale),
    money: (n: number) => (settings ? formatMoney(n, locale, settings) : String(n)),
  }
}
