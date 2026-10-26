import { useState, type ReactNode } from 'react'
import type { I18nText, Locale } from '@/lib/types'

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[22px] bg-white p-4 ring-1 ring-ink/5 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-2xl text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Label({ label, hint, children, error }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-mist">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

const LANGS: { id: Locale; label: string }[] = [
  { id: 'fr', label: 'FR' },
  { id: 'ar', label: 'AR' },
  { id: 'en', label: 'EN' },
]

/** One text in three languages, edited through small FR / AR / EN tabs. */
export function I18nInput({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string
  value: I18nText | null | undefined
  onChange: (v: I18nText) => void
  multiline?: boolean
  required?: boolean
}) {
  const [lang, setLang] = useState<Locale>('fr')
  const v = value ?? { fr: '', ar: '', en: '' }
  const set = (text: string) => onChange({ ...v, [lang]: text })
  const missing = LANGS.filter((l) => !v[l.id]?.trim()).map((l) => l.label)
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        <span className="inline-flex rounded-full bg-blush p-0.5" role="tablist">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={lang === l.id}
              onClick={() => setLang(l.id)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lang === l.id ? 'bg-garnet text-white' : 'text-garnet'} ${!v[l.id]?.trim() ? 'italic opacity-70' : ''}`}
            >
              {l.label}
            </button>
          ))}
        </span>
      </div>
      {multiline ? (
        <textarea className="field min-h-24" dir={lang === 'ar' ? 'rtl' : 'ltr'} value={v[lang] ?? ''} onChange={(e) => set(e.target.value)} />
      ) : (
        <input className="field" dir={lang === 'ar' ? 'rtl' : 'ltr'} value={v[lang] ?? ''} onChange={(e) => set(e.target.value)} />
      )}
      {missing.length > 0 && missing.length < 3 && <span className="mt-1 block text-xs text-mist">{missing.join(', ')} ∅</span>}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-garnet' : 'bg-ink/20'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`} />
      </button>
      {label}
    </label>
  )
}

export function NumberInput({ value, onChange, step = 1, min = 0 }: { value: number | null | undefined; onChange: (v: number | null) => void; step?: number; min?: number }) {
  return (
    <input
      className="field tabular-nums"
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

