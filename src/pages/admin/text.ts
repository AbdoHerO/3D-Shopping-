import { useTranslation } from 'react-i18next'

/** Admin copy is written in French and English (Arabic falls back to French). */
export function useA() {
  const { i18n } = useTranslation()
  const en = i18n.language === 'en'
  return (fr: string, english: string) => (en ? english : fr)
}

