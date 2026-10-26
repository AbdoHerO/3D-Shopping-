import { create } from 'zustand'

export type Phase = 'outside' | 'entering' | 'inside'
export type Panel = null | 'cart' | 'checkout' | 'details' | 'help'

export interface Selection {
  productId: string
  variantId: string | null
}

interface Toast {
  id: number
  text: string
  kind: 'added' | 'info'
  image?: string
}

interface UiState {
  phase: Phase
  selected: Selection | null
  hovered: string | null
  focus: string | null
  navMode: 'guided' | 'walk'
  panel: Panel
  mapOpen: boolean
  hint: string | null
  toasts: Toast[]
  /** Bumped on every add-to-basket so 3D effects can react. */
  addedTick: number
  lastAdded: Selection | null
  /** The 3D scene has rendered and product images are on the shelves. */
  sceneReady: boolean
  setSceneReady: (v: boolean) => void
  setPhase: (p: Phase) => void
  select: (s: Selection | null) => void
  hover: (id: string | null) => void
  setFocus: (id: string | null) => void
  setNavMode: (m: 'guided' | 'walk') => void
  openPanel: (p: Panel) => void
  toggleMap: (open?: boolean) => void
  showHint: (text: string | null, ms?: number) => void
  toast: (text: string, kind?: Toast['kind'], image?: string) => void
  dismissToast: (id: number) => void
  bumpAdded: (s: Selection) => void
}

let hintTimer: ReturnType<typeof setTimeout> | undefined
let toastId = 0

export const useUi = create<UiState>((set, get) => ({
  phase: 'outside',
  selected: null,
  hovered: null,
  focus: null,
  navMode: 'guided',
  panel: null,
  mapOpen: false,
  hint: null,
  toasts: [],
  addedTick: 0,
  lastAdded: null,
  sceneReady: false,
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setPhase: (phase) => set({ phase }),
  select: (selected) => set({ selected }),
  hover: (hovered) => {
    if (get().hovered !== hovered) set({ hovered })
  },
  setFocus: (focus) => set({ focus }),
  setNavMode: (navMode) => set({ navMode }),
  openPanel: (panel) => set({ panel }),
  toggleMap: (open) => set((s) => ({ mapOpen: open ?? !s.mapOpen })),
  showHint: (hint, ms = 3800) => {
    clearTimeout(hintTimer)
    set({ hint })
    if (hint && ms > 0) hintTimer = setTimeout(() => set({ hint: null }), ms)
  },
  toast: (text, kind = 'info', image) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind, image }] }))
    setTimeout(() => get().dismissToast(id), 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  bumpAdded: (lastAdded) => set((s) => ({ addedTick: s.addedTick + 1, lastAdded })),
}))
