import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'

import { SteamBackground } from './components/SteamBackground'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CatalogPage } from './pages/CatalogPage'
import { HomePage } from './pages/HomePage'
import { JoinRoomPage } from './pages/JoinRoomPage'
import { NewRoomPage } from './pages/NewRoomPage'
import { NotesPage } from './pages/NotesPage'
import { RoomPage } from './pages/RoomPage'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SteamBackground />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewRoomPage />} />
          <Route path="/join" element={<JoinRoomPage />} />
          <Route path="/r/:slug" element={<RoomPage />} />
          <Route path="/r/:slug/notes" element={<NotesPage />} />
          <Route path="/r/:slug/analytics" element={<AnalyticsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
