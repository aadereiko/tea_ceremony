import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Field } from '../components/Field'
import { Leaf } from '../components/Leaf'
import { api, type Session } from '../lib/api'
import { saveRoom, savedRooms } from '../lib/sessions'

function remember(session: Session) {
  saveRoom({
    slug: session.room.slug,
    name: session.room.name,
    token: session.token,
    me: session.me.display_name,
  })
}

function roomCodeFrom(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/r\/([a-z0-9]+)/i)
  return (match ? match[1] : trimmed).toLowerCase()
}

export function HomePage() {
  const navigate = useNavigate()
  const rooms = savedRooms()

  const [create, setCreate] = useState({ name: '', password: '', display_name: '' })
  const [join, setJoin] = useState({ code: '', password: '', display_name: '' })

  const createRoom = useMutation({
    mutationFn: () => api.createRoom(create),
    onSuccess: (session) => {
      remember(session)
      navigate(`/r/${session.room.slug}`)
    },
  })
  const joinRoom = useMutation({
    mutationFn: () =>
      api.joinRoom(roomCodeFrom(join.code), {
        password: join.password,
        display_name: join.display_name,
      }),
    onSuccess: (session) => {
      remember(session)
      navigate(`/r/${session.room.slug}`)
    },
  })

  const submit = (run: () => void) => (e: FormEvent) => {
    e.preventDefault()
    run()
  }

  return (
    <main className="wrap">
      <header className="top">
        <span className="brand">
          <Leaf size={26} />
        </span>
        <h1>Tea Ceremony</h1>
        <p className="muted center">Taste teas together, rate them, and find out what you all like.</p>
      </header>

      {rooms.length > 0 && (
        <section className="panel">
          <span className="label">Your rooms</span>
          <ul className="room-list">
            {rooms.map((r) => (
              <li key={r.slug}>
                <Link to={`/r/${r.slug}`} className="room-link">
                  <b>{r.name}</b>
                  <span className="muted">as {r.me}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="two-col">
        <form className="panel" onSubmit={submit(() => createRoom.mutate())}>
          <h2>New room</h2>
          <Field
            id="create-name"
            label="Room name"
            required
            maxLength={80}
            value={create.name}
            onChange={(e) => setCreate({ ...create, name: e.target.value })}
            placeholder="Advent calendar 2026"
          />
          <Field
            id="create-password"
            label="Room password"
            type="password"
            required
            minLength={4}
            value={create.password}
            onChange={(e) => setCreate({ ...create, password: e.target.value })}
            hint="Everyone joining needs it. At least 4 characters."
          />
          <Field
            id="create-me"
            label="Your name"
            required
            maxLength={40}
            value={create.display_name}
            onChange={(e) => setCreate({ ...create, display_name: e.target.value })}
          />
          {createRoom.error && <p className="error">{createRoom.error.message}</p>}
          <button className="primary" disabled={createRoom.isPending}>
            {createRoom.isPending ? 'Creating…' : 'Create room'}
          </button>
        </form>

        <form className="panel" onSubmit={submit(() => joinRoom.mutate())}>
          <h2>Join a room</h2>
          <Field
            id="join-code"
            label="Room code or link"
            required
            value={join.code}
            onChange={(e) => setJoin({ ...join, code: e.target.value })}
            placeholder="k7m2pqxa"
          />
          <Field
            id="join-password"
            label="Room password"
            type="password"
            required
            value={join.password}
            onChange={(e) => setJoin({ ...join, password: e.target.value })}
          />
          <Field
            id="join-me"
            label="Your name"
            required
            maxLength={40}
            value={join.display_name}
            onChange={(e) => setJoin({ ...join, display_name: e.target.value })}
            hint="Already in this room? Use the same name to continue as yourself."
          />
          {joinRoom.error && <p className="error">{joinRoom.error.message}</p>}
          <button className="primary" disabled={joinRoom.isPending}>
            {joinRoom.isPending ? 'Joining…' : 'Join room'}
          </button>
        </form>
      </div>
    </main>
  )
}
