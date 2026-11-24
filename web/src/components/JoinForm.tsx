import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'

import { api, type Session } from '../lib/api'
import { saveRoom } from '../lib/sessions'
import { Field } from './Field'

export function JoinForm({ slug, onJoined }: { slug: string; onJoined: (s: Session) => void }) {
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const join = useMutation({
    mutationFn: () => api.joinRoom(slug, { password, display_name: name }),
    onSuccess: (session) => {
      saveRoom({
        slug,
        name: session.room.name,
        token: session.token,
        me: session.me.display_name,
      })
      onJoined(session)
    },
  })

  return (
    <main className="wrap narrow">
      <header className="top">
        <h1>Join room</h1>
        <p className="muted center">
          Room code <b>{slug}</b>
        </p>
      </header>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault()
          join.mutate()
        }}
      >
        <Field
          id="room-password"
          label="Room password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          id="room-name"
          label="Your name"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Already in this room? Use the same name to continue as yourself."
        />
        {join.error && <p className="error">{join.error.message}</p>}
        <button className="primary" disabled={join.isPending}>
          {join.isPending ? 'Joining…' : 'Join'}
        </button>
        <Link to="/" className="muted center small-link">
          Back to start
        </Link>
      </form>
    </main>
  )
}
