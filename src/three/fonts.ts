import serifUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url'
import serifItalicUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff?url'
import sansUrl from '@fontsource/jost/files/jost-latin-500-normal.woff?url'
import arabicUrl from '@fontsource/tajawal/files/tajawal-arabic-700-normal.woff?url'
import type { Locale } from '@/lib/types'

export const FONTS = { serif: serifUrl, serifItalic: serifItalicUrl, sans: sansUrl, arabic: arabicUrl }

/** Sign font for a locale: Tajawal for Arabic, Cormorant Garamond otherwise. */
export const signFont = (locale: Locale) => (locale === 'ar' ? FONTS.arabic : FONTS.serif)
