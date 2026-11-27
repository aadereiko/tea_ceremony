import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AppHeader } from './components/AppHeader'
import { SteamBackground } from './components/SteamBackground'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CatalogPage } from './pages/CatalogPage'
import { DocsPage } from './pages/DocsPage'
import { HomePage } from './pages/HomePage'
import { JoinRoomPage } from './pages/JoinRoomPage'
import { NewRoomPage } from './pages/NewRoomPage'
import { NotesPage } from './pages/NotesPage'
import { RoomPage } from './pages/RoomPage'
import './styles.css'

// The map library is big, so it only downloads when someone opens the shops.
const ShopsPage = lazy(() => import('./pages/ShopsPage').then((m) => ({ default: m.ShopsPage })))
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })))

function Loading() {
  return (
    <main className="wrap">
      <p className="muted">Loading…</p>
    </main>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SteamBackground />
      <BrowserRouter>
        <AppHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewRoomPage />} />
          <Route path="/join" element={<JoinRoomPage />} />
          <Route path="/r/:slug" element={<RoomPage />} />
          <Route path="/r/:slug/notes" element={<NotesPage />} />
          <Route path="/r/:slug/analytics" element={<AnalyticsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:page" element={<DocsPage />} />
          <Route path="/shops" element={<Suspense fallback={<Loading />}><ShopsPage /></Suspense>} />
          <Route path="/shops/:id" element={<Suspense fallback={<Loading />}><ShopPage /></Suspense>} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
