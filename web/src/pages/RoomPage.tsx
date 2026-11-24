import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { AnalyticsView } from '../components/AnalyticsView'
import { JoinForm } from '../components/JoinForm'
import { Leaf } from '../components/Leaf'
import { Sheet } from '../components/Sheet'
import { TeaForm } from '../components/TeaForm'
import { TeaSheet } from '../components/TeaSheet'
import { api, ApiError, type TeaInput } from '../lib/api'
import { fmt } from '../lib/format'
import { forgetRoom, tokenFor } from '../lib/sessions'
import { tinStyle } from '../lib/tins'

type Tab = 'teas' | 'analytics'

export function RoomPage() {
  const slug = (useParams().slug ?? '').toLowerCase()
  const [token, setToken] = useState(() => tokenFor(slug))

  if (!token) return <JoinForm slug={slug} onJoined={(s) => setToken(s.token)} />
  return <Room slug={slug} token={token} onSignedOut={() => setToken(null)} />
}

function Room({ slug, token, onSignedOut }: { slug: string; token: string; onSignedOut: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'teas'
  const setTab = (next: Tab) => setSearchParams(next === 'teas' ? {} : { tab: next }, { replace: true })
  const [openTeaId, setOpenTeaId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)

  const room = useQuery({ queryKey: ['room', slug], queryFn: () => api.room(slug, token) })
  const teas = useQuery({
    queryKey: ['teas', slug],
    queryFn: () => api.teas(slug, token),
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (room.error instanceof ApiError && room.error.status === 401) {
      forgetRoom(slug)
      onSignedOut()
    }
  }, [room.error, slug, onSignedOut])

  const addTea = useMutation({
    mutationFn: (body: TeaInput) => api.addTea(slug, token, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teas', slug] })
      setAdding(false)
    },
  })

  if (room.isPending) return <main className="wrap"><p className="muted center">Loading room…</p></main>
  if (room.error) return <main className="wrap"><p className="error">{room.error.message}</p></main>

  const { room: info, me } = room.data
  const teaList = teas.data ?? []
  const openIndex = teaList.findIndex((t) => t.id === openTeaId)
  const inviteLink = `${window.location.origin}/r/${slug}`

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="wrap">
      <header className="top">
        <Link to="/" className="brand" aria-label="All rooms">
          <Leaf size={24} />
        </Link>
        <h1>{info.name}</h1>
        <div className="room-meta">
          <span className="muted">
            Code <b className="code">{slug}</b>
          </span>
          <button className="ghost small" onClick={copyInvite}>
            {copied ? 'Link copied' : 'Copy invite link'}
          </button>
        </div>
        <div className="people">
          {info.participants.map((p) => (
            <span key={p.id} className={`person${p.id === me.id ? ' me' : ''}`}>
              {p.display_name}
              {p.id === me.id && <small> (you)</small>}
            </span>
          ))}
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'teas'} className="tab" onClick={() => setTab('teas')}>
          Teas
        </button>
        <button
          role="tab"
          aria-selected={tab === 'analytics'}
          className="tab"
          onClick={() => setTab('analytics')}
        >
          Analytics
        </button>
      </nav>

      {tab === 'teas' && (
        <section className="stack">
          {teas.error && <p className="error">{teas.error.message}</p>}
          <div className="tins">
            {teaList.map((tea, i) => (
              <button key={tea.id} className="tin" style={tinStyle(i)} onClick={() => setOpenTeaId(tea.id)}>
                <span className="tin-num">{i + 1}</span>
                <span className="tin-name">{tea.name}</span>
                <span className="tin-foot">
                  {tea.my_rating ? (
                    <span className="tin-score">
                      {tea.average_overall != null ? fmt(tea.average_overall) : '✓'}
                    </span>
                  ) : (
                    <span className="tin-todo">Rate</span>
                  )}
                  <span className="tin-count">{tea.rating_count > 0 && `${tea.rating_count} rated`}</span>
                </span>
              </button>
            ))}
            <button className="tin add-tin" onClick={() => setAdding(true)}>
              <span className="plus">+</span>
              <span>Add tea</span>
            </button>
          </div>
          {teas.isSuccess && teaList.length === 0 && (
            <p className="muted center">No teas yet. Add the first one.</p>
          )}
        </section>
      )}

      {tab === 'analytics' && <AnalyticsView slug={slug} token={token} />}

      <footer className="footer">
        <span className="muted small">You are {me.display_name}</span>
        <button
          className="ghost small"
          onClick={() => {
            forgetRoom(slug)
            navigate('/')
          }}
        >
          Leave on this device
        </button>
      </footer>

      <TeaSheet
        slug={slug}
        token={token}
        me={me}
        tea={openIndex >= 0 ? teaList[openIndex] : null}
        index={Math.max(openIndex, 0)}
        onClose={() => setOpenTeaId(null)}
      />
      <Sheet open={adding} onClose={() => setAdding(false)} eyebrow={info.name} title="Add tea">
        <TeaForm
          submitLabel="Add tea"
          pending={addTea.isPending}
          error={addTea.error?.message ?? null}
          onSubmit={(body) => addTea.mutate(body)}
        />
      </Sheet>
    </main>
  )
}
