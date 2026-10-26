import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './fr'
import en from './en'
import ar from './ar'
import { LOCALES, type Locale } from '@/lib/types'

const STORAGE_KEY = 'boutique.locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && LOCALES.includes(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'fr').slice(0, 2) as Locale
  return LOCALES.includes(nav) ? nav : 'fr'
}

export function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng: initialLocale(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
})
applyDocumentLocale(i18n.language as Locale)

export function setLocale(locale: Locale) {
  void i18n.changeLanguage(locale)
  applyDocumentLocale(locale)
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* storage unavailable */
  }
}

export default i18n
