import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router'
import { LanguageSelect, Monogram } from '@/ui/Header'
import { Icon, type IconName } from '@/ui/Icon'
import { adminApi } from './api'
import { useAdmin } from './store'
import { useA } from './text'
import Dashboard from './Dashboard'
import Orders from './Orders'
import Products from './Products'
import ProductEditor from './ProductEditor'
import Placement from './Placement'
import Delivery from './Delivery'
import SettingsPage from './SettingsPage'

type Gate = 'checking' | 'signedOut' | 'forbidden' | 'ready'

async function gateFor(): Promise<Gate> {
  const session = await adminApi.session()
  if (!session) return 'signedOut'
  return (await adminApi.isAdmin()) ? 'ready' : 'forbidden'
}

function Login({ onDone }: { onDone: () => void }) {
  const a = useA()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-dvh place-items-center bg-porcelain p-4">
      <form
        className="w-full max-w-sm rounded-[26px] bg-white p-6 shadow-float"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await adminApi.signIn(email, password)
            onDone()
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <h1 className="font-display text-3xl text-garnet">{a('Espace boutique', 'Shop admin')}</h1>
        <p className="mt-1 text-sm text-mist">{a('Connectez-vous avec le compte administrateur.', 'Sign in with the admin account.')}</p>
        <label className="mt-5 block text-sm font-medium">
          Email
          <input className="field mt-1" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-3 block text-sm font-medium">
          {a('Mot de passe', 'Password')}
          <input className="field mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="mt-3 rounded-xl bg-danger/10 p-2 text-sm text-danger">{error}</p>}
        <button className="btn-primary mt-5 w-full" disabled={busy}>
          {a('Se connecter', 'Sign in')}
        </button>
        <Link to="/" className="mt-3 block text-center text-sm text-garnet">
          {a('Retour à la boutique', 'Back to the boutique')}
        </Link>
      </form>
    </div>
  )
}

const NAV: { to: string; icon: IconName; fr: string; en: string }[] = [
  { to: '/admin', icon: 'sparkle', fr: 'Tableau de bord', en: 'Dashboard' },
  { to: '/admin/orders', icon: 'bag', fr: 'Commandes', en: 'Orders' },
  { to: '/admin/products', icon: 'list', fr: 'Produits', en: 'Products' },
  { to: '/admin/placement', icon: 'store', fr: 'Rayons', en: 'Shelves' },
  { to: '/admin/delivery', icon: 'truck', fr: 'Livraison', en: 'Delivery' },
  { to: '/admin/settings', icon: 'help', fr: 'Réglages', en: 'Settings' },
]

export default function AdminApp() {
  const a = useA()
  const [gate, setGate] = useState<Gate>('checking')
  const { catalog, load, error, notice, busy } = useAdmin()

  const check = async () => {
    const next = await gateFor()
    setGate(next)
    if (next === 'ready') void load()
  }
  useEffect(() => {
    let cancelled = false
    gateFor().then((next) => {
      if (cancelled) return
      setGate(next)
      if (next === 'ready') void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  if (gate === 'checking') return <p className="grid min-h-dvh place-items-center text-mist">…</p>
  if (gate === 'signedOut') return <Login onDone={check} />
  if (gate === 'forbidden')
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl">{a("Ce compte n'est pas administrateur.", 'This account is not an admin.')}</p>
          <button className="btn-quiet mt-4" onClick={() => adminApi.signOut().then(check)}>
            {a('Se déconnecter', 'Sign out')}
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-dvh bg-porcelain md:grid md:grid-cols-[230px_1fr]">
      <aside className="border-ink/5 bg-blush/50 md:sticky md:top-0 md:h-dvh md:border-e print:hidden">
        <div className="flex items-center gap-2 px-4 py-4">
          {catalog && <Monogram name={catalog.settings.shopName} />}
          <div className="min-w-0">
            <p className="truncate font-display text-xl text-garnet">{catalog?.settings.shopName}</p>
            <p className="text-xs text-mist">{a('Espace boutique', 'Shop admin')}</p>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/admin'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-garnet text-white' : 'text-ink hover:bg-white'}`
              }
            >
              <Icon name={n.icon} size={18} />
              {a(n.fr, n.en)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-col gap-2 px-4 pt-4 md:flex">
          <LanguageSelect />
          <Link to="/" className="btn-quiet h-10 !py-0 text-sm">
            <Icon name="store" size={18} />
            {a('Voir la boutique', 'View the boutique')}
          </Link>
          {adminApi.mode === 'live' && (
            <button className="text-start text-sm text-mist hover:text-garnet" onClick={() => adminApi.signOut().then(check)}>
              {a('Se déconnecter', 'Sign out')}
            </button>
          )}
        </div>
      </aside>
      <main className="min-w-0 px-4 py-5 sm:px-6">
        {adminApi.mode === 'demo' && (
          <p className="mb-4 rounded-2xl bg-champagne/15 p-3 text-sm print:hidden" data-testid="demo-banner">
            {a(
              "Mode démo : vos modifications sont enregistrées dans ce navigateur uniquement. Connectez Supabase (voir le README) pour les partager avec vos clientes, ou exportez le catalogue depuis Réglages.",
              'Demo mode: your changes are saved in this browser only. Connect Supabase (see the README) to share them with customers, or export the catalog from Settings.',
            )}
          </p>
        )}
        {error && <p className="mb-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error === 'storage-full' ? a('Le stockage du navigateur est plein : utilisez des photos plus légères.', 'Browser storage is full: use lighter photos.') : error}</p>}
        {!catalog ? (
          <p className="py-20 text-center text-mist">{busy ? '…' : ''}</p>
        ) : (
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="placement" element={<Placement />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        )}
      </main>
      {notice && (
        <p className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-garnet px-4 py-2 text-sm text-white shadow-float print:hidden" role="status">
          {notice === 'saved' ? a('Enregistré', 'Saved') : notice === 'deleted' ? a('Supprimé', 'Deleted') : notice}
        </p>
      )}
    </div>
  )
}
