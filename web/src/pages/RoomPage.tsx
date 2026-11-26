import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { AddTeaSheet } from '../components/AddTeaSheet'
import { IconPicker } from '../components/IconPicker'
import { JoinForm } from '../components/JoinForm'
import { Heading, KindIcon } from '../components/KindIcon'
import { Sheet } from '../components/Sheet'
import { TeaSheet } from '../components/TeaSheet'
import { Toggle } from '../components/Toggle'
import { api, ApiError, shownTea } from '../lib/api'
import { hueStyle, teaStyle } from '../lib/avatar'
import { fmt } from '../lib/format'
import { PERSON_ICONS, ROOM_ICONS } from '../lib/icons'
import { forgetRoom, saveProfile, tokenFor, updateSavedRoom } from '../lib/sessions'
import { TeaBadge } from '../components/TeaBadge'
import { Illustration } from '../lib/illustrations'
import { teaColor } from '../lib/icons'
import { useConfirm } from '../components/Confirm'
import { PeoplePopover } from '../components/PeoplePopover'


type View = 'list' | 'cards'

const brewName = (color: string | null) => {
  const brew = teaColor(color)
  return brew ? `${brew.name} brew` : undefined
}
const VIEW_KEY = 'tea-ceremony:view'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}

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
  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  const openTeaId = searchParams.get('tea')
  const setOpenTeaId = (id: string | null) => setParam('tea', id)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [confirmDialog, confirm] = useConfirm()
  const [picking, setPicking] = useState<'settings' | 'me' | 'more' | null>(null)
  const [view, setView] = useState<View>(readView)
  const chooseView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Private mode: the choice just won't be remembered.
    }
  }

  const room = useQuery({ queryKey: ['room', slug], queryFn: () => api.room(slug, token) })
  const teas = useQuery({
    queryKey: ['teas', slug],
    queryFn: () => api.teas(slug, token),
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (room.data) updateSavedRoom(slug, { name: room.data.room.name, icon: room.data.room.icon })
  }, [room.data, slug])

  useEffect(() => {
    if (room.error instanceof ApiError && room.error.status === 401) {
      forgetRoom(slug)
      onSignedOut()
    }
  }, [room.error, slug, onSignedOut])

  const changeIcon = useMutation({
    mutationFn: (icon: string) =>
      picking === 'settings' ? api.updateRoom(slug, token, { icon }) : api.updateMe(slug, token, { icon }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['room', slug] })
      queryClient.invalidateQueries({ queryKey: ['teas', slug] })
      if (picking === 'me') {
        saveProfile({ name: session.me.display_name, icon: session.me.icon })
        setPicking(null)
      }
    },
  })
  const changeSettings = useMutation({
    mutationFn: (body: { blind?: boolean; anonymous?: boolean }) => api.updateRoom(slug, token, body),
    onSuccess: () => {
      for (const key of ['room', 'teas', 'analytics']) queryClient.invalidateQueries({ queryKey: [key, slug] })
    },
  })
  const deleteRoom = useMutation({
    mutationFn: () => api.deleteRoom(slug, token),
    onSuccess: () => {
      forgetRoom(slug)
      queryClient.removeQueries({ queryKey: ['teas', slug] })
      queryClient.removeQueries({ queryKey: ['room', slug] })
      navigate('/')
    },
  })

  if (room.isPending) return <main className="wrap"><p className="muted center">Loading room…</p></main>
  if (room.error) return <main className="wrap"><p className="error">{room.error.message}</p></main>

  const { room: info, me } = room.data
  const people = [me, ...info.participants.filter((p) => p.id !== me.id)]
  const tastings = teas.data ?? []
  const openIndex = tastings.findIndex((t) => t.id === openTeaId)
  const inviteLink = `${window.location.origin}/r/${slug}`

  const copy = async (what: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? inviteLink : slug)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <main className="wrap">
      <header className="room-head">
        <nav className="top-bar">
          <Link to="/" className="back-link">
            ‹ My rooms
          </Link>
          <button
            className="icon-action tip tip-below tip-end"
            data-tip="Leave on this device"
            aria-label="Leave on this device"
            onClick={() => {
              forgetRoom(slug)
              navigate('/')
            }}
          >
            <KindIcon kind="leave" size={18} />
          </button>
        </nav>
        <div className="room-title">
          <button
            className="brand brand-icon"
            style={hueStyle(info.name)}
            onClick={() => setPicking('settings')}
            disabled={!me.is_owner}
            aria-label={me.is_owner ? 'Room settings' : undefined}
          >
            <Illustration name={info.icon} size={28} />
          </button>
          <div className="grow">
            <h1>{info.name}</h1>
            <span className="muted small with-icon">
              <button
                className="code-copy tip tip-below"
                data-tip={copied === 'code' ? 'Copied' : 'Copy code'}
                aria-label={copied === 'code' ? 'Room code copied' : `Copy room code ${slug}`}
                onClick={() => copy('code')}
              >
                <b className="code">{slug}</b>
                <KindIcon kind={copied === 'code' ? 'check' : 'copy'} size={14} />
              </button>
            </span>
            {(info.blind || info.anonymous) && (
              <span className="modes">
                {info.blind && (
                  <span className="mode with-icon">
                    <KindIcon kind="eye-off" size={13} />
                    Blind tasting
                  </span>
                )}
                {info.anonymous && (
                  <span className="mode with-icon">
                    <KindIcon kind="anonymous" size={13} />
                    Anonymous ratings
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="head-actions">
            {me.is_owner && (
              <button className="icon-action primary tip tip-below" data-tip="Add tea" aria-label="Add tea" onClick={() => setAdding(true)}>
                <KindIcon kind="plus" size={18} />
              </button>
            )}
            <Link to={`/r/${slug}/analytics`} className="icon-action tip tip-below" data-tip="Analytics" aria-label="Analytics">
              <KindIcon kind="chart" size={18} />
            </Link>
            <button
              className="icon-action tip tip-below"
              data-tip={copied === 'link' ? 'Link copied' : 'Copy invite link'}
              aria-label={copied === 'link' ? 'Link copied' : 'Copy invite link'}
              onClick={() => copy('link')}
            >
              <KindIcon kind={copied === 'link' ? 'check' : 'link'} size={18} />
            </button>
            {me.is_owner && (
              <button
                className="icon-action danger-text tip tip-below"
                data-tip="Delete room"
                aria-label="Delete room"
                onClick={() =>
                  confirm({
                    title: 'Delete this room?',
                    message: `“${info.name}” and all its teas, ratings and people will be deleted for everyone. This can't be undone.`,
                    confirmLabel: 'Delete room',
                    danger: true,
                    action: () => deleteRoom.mutateAsync(),
                  })
                }
              >
                <KindIcon kind="trash" size={18} />
              </button>
            )}
            <button className="icon-action tip tip-below tip-end" data-tip="More" aria-label="More" onClick={() => setPicking('more')}>
              <KindIcon kind="more" size={18} />
            </button>
          </div>
        </div>
        <PeoplePopover people={people} meId={me.id} onChangeAnimal={() => setPicking('me')} />
      </header>

      <section className="stack">
          {teas.error && <p className="error">{teas.error.message}</p>}
          {tastings.length > 0 && (
            <div className="row-between">
              <Heading kind="tea">
                Teas <span className="muted">{tastings.length}</span>
              </Heading>
              <span className="actions">
                <span className="view-switch" role="group" aria-label="Show teas as">
                  {(['list', 'cards'] as const).map((v) => (
                    <button key={v} aria-pressed={view === v} onClick={() => chooseView(v)}>
                      {v === 'list' ? 'List' : 'Cards'}
                    </button>
                  ))}
                </span>
              </span>
            </div>
          )}
          {tastings.length > 0 ? (
            <ul className={view === 'cards' ? 'tea-cards' : 'tea-list'}>
              {tastings.map((tasting, i) => {
                const tea = shownTea(tasting, i + 1)
                const sub = [
                  `#${i + 1}`,
                  tasting.tea?.ingredients
                    .slice(0, 3)
                    .map((g) => g.name)
                    .join(', '),
                  tasting.rating_count > 0 && `${tasting.rating_count} rated`,
                ]
                  .filter(Boolean)
                  .join(' · ')
                const score = tasting.my_rating ? (
                  <span className="score-pill">
                    {tasting.average_overall != null ? fmt(tasting.average_overall) : '✓'}
                  </span>
                ) : null
                return (
                  <li key={tasting.id}>
                    {view === 'cards' ? (
                      <button className={`tea-card${tasting.hidden ? ' mystery' : ''}`} onClick={() => setOpenTeaId(tasting.id)}>
                        <span
                          className={`tea-card-art${brewName(tea.color) ? ' tip' : ''}`}
                          style={tasting.hidden ? undefined : teaStyle(tea.color, tea.name)}
                          data-tip={brewName(tea.color)}
                        >
                          <span className="tea-card-num">#{i + 1}</span>
                          <Illustration name={tea.icon} size={52} />
                        </span>
                        <span className="tea-card-body">
                          <span className="tea-name">{tasting.hidden ? 'Mystery tea' : tea.name}</span>
                          <span className="tea-sub">
                            {tasting.hidden
                              ? 'Hidden until someone reveals it'
                              : tasting.tea?.ingredients
                                  .slice(0, 3)
                                  .map((g) => g.name)
                                  .join(', ') || 'No ingredients'}
                          </span>
                          <span className="tea-card-foot">
                            <span className="tea-sub">
                              {tasting.rating_count > 0 ? `${tasting.rating_count} rated` : 'Not rated yet'}
                            </span>
                            {score}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <button className={`tea-row${tasting.hidden ? ' mystery' : ''}`} onClick={() => setOpenTeaId(tasting.id)}>
                        <TeaBadge tea={tea} />
                        <span className="tea-main">
                          <span className="tea-name">{tea.name}</span>
                          <span className="tea-sub">{sub}</span>
                        </span>
                        {score}
                        <span className="chev" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            teas.isSuccess && (
              <div className="panel empty">
                <span className="brand">
                  <KindIcon kind="tea" size={26} />
                </span>
                <h2>No teas yet</h2>
                {me.is_owner ? (
                  <>
                    <p className="muted center pre">Pick one from the catalog or add a new one.</p>
                    <button className="primary" onClick={() => setAdding(true)}>
                      + Add tea
                    </button>
                  </>
                ) : (
                  <p className="muted center pre">The host hasn't added any teas yet.</p>
                )}
              </div>
            )
          )}
        </section>




      <TeaSheet
        slug={slug}
        token={token}
        me={me}
        tasting={openIndex >= 0 ? tastings[openIndex] : null}
        index={Math.max(openIndex, 0)}
        blind={info.blind}
        onClose={() => setOpenTeaId(null)}
      />
      <AddTeaSheet
        open={adding}
        slug={slug}
        token={token}
        roomName={info.name}
        inRoom={new Set(tastings.flatMap((t) => (t.tea ? [t.tea.id] : [])))}
        onClose={() => setAdding(false)}
      />
      <Sheet open={picking === 'more'} onClose={() => setPicking(null)} eyebrow={info.name} title="More">
        <nav className="menu">
          <Link to={`/r/${slug}/notes?who=${me.id}&print=1`} className="menu-item">
            <KindIcon kind="download" size={18} />
            <span>
              My notes as PDF
              <small className="muted">Your scores and notes for every tea</small>
            </span>
          </Link>
          <Link to={`/r/${slug}/notes?print=1`} className="menu-item">
            <KindIcon kind="download" size={18} />
            <span>
              Room notes as PDF
              <small className="muted">Everyone's revealed scores and notes</small>
            </span>
          </Link>
          {me.is_owner && (
            <button className="menu-item" onClick={() => setPicking('settings')}>
              <KindIcon kind="room" size={18} />
              <span>
                Room settings
                <small className="muted">Icon, blind tasting, anonymous ratings</small>
              </span>
            </button>
          )}
        </nav>
      </Sheet>
      <Sheet
        open={picking === 'settings' || picking === 'me'}
        onClose={() => setPicking(null)}
        eyebrow={info.name}
        title={picking === 'settings' ? 'Room settings' : 'Your animal'}
      >
        <IconPicker
          label={picking === 'settings' ? 'Room icon' : 'Pick one'}
          icons={picking === 'settings' ? ROOM_ICONS : PERSON_ICONS}
          value={picking === 'settings' ? info.icon : me.icon}
          onChange={(icon) => icon && changeIcon.mutate(icon)}
        />
        {picking === 'settings' && (
          <>
            <Toggle
              id="room-blind"
              label="Blind tasting"
              hint="Teas show as “Mystery tea” until someone reveals them. Turning it off shows every tea."
              checked={info.blind}
              disabled={changeSettings.isPending}
              onChange={(blind) => changeSettings.mutate({ blind })}
            />
            <Toggle
              id="room-anonymous"
              label="Anonymous ratings"
              hint="Nobody sees who gave which score or note. Per-person analytics are hidden."
              checked={info.anonymous}
              disabled={changeSettings.isPending}
              onChange={(anonymous) => changeSettings.mutate({ anonymous })}
            />
          </>
        )}
        {(changeIcon.error ?? changeSettings.error) && (
          <p className="error">{(changeIcon.error ?? changeSettings.error)!.message}</p>
        )}
      </Sheet>
      {confirmDialog}
    </main>
  )
}
