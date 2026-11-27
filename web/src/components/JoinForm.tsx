import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'

import { api, type Session } from '../lib/api'
import { PERSON_ICONS } from '../lib/icons'
import { rememberSession, savedProfile } from '../lib/sessions'
import { Field } from './Field'
import { IconPicker } from './IconPicker'

type Props = { slug: string; signedOut?: boolean; onJoined: (s: Session) => void }

export function JoinForm({ slug, signedOut = false, onJoined }: Props) {
  const [password, setPassword] = useState('')
  const [profile] = useState(savedProfile)
  const [name, setName] = useState(profile.name)
  const [icon, setIcon] = useState<string | null>(profile.icon)
  const join = useMutation({
    mutationFn: () => api.joinRoom(slug, { password, display_name: name, my_icon: icon }),
    onSuccess: (session) => {
      rememberSession(session)
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
      {signedOut && (
        <div className="notice small">
          You're no longer signed in to this room. The host may have deleted it. If it still exists, join again
          with its password.
        </div>
      )}
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
        <IconPicker label="Your animal (optional)" icons={PERSON_ICONS} value={icon} onChange={setIcon} />
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
