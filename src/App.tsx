import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router'
import { useCatalog } from '@/state/catalog'
import StorePage from '@/pages/StorePage'

const Router = import.meta.env.VITE_ROUTER === 'hash' || import.meta.env.MODE === 'artifact' ? HashRouter : BrowserRouter

const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const OrderPage = lazy(() => import('@/pages/OrderPage'))
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'))

export default function App() {
  const load = useCatalog((s) => s.load)
  useEffect(() => {
    void load()
  }, [load])
  return (
    <Router basename={import.meta.env.MODE === 'artifact' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/p/:slug" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:number" element={<OrderPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<StorePage />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
