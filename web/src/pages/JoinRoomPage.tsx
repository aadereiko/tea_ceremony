import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Field } from '../components/Field'
import { IconPicker } from '../components/IconPicker'
import { Heading } from '../components/KindIcon'
import { api } from '../lib/api'
import { PERSON_ICONS } from '../lib/icons'
import { rememberSession, savedProfile } from '../lib/sessions'

function roomCodeFrom(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/r\/([a-z0-9]+)/i)
  return (match ? match[1] : trimmed).toLowerCase()
}

export function JoinRoomPage() {
  const navigate = useNavigate()
  const [profile] = useState(savedProfile)
  const [form, setForm] = useState({
    code: '',
    password: '',
    display_name: profile.name,
    my_icon: profile.icon,
  })
  const join = useMutation({
    mutationFn: () =>
      api.joinRoom(roomCodeFrom(form.code), {
        password: form.password,
        display_name: form.display_name,
        my_icon: form.my_icon,
      }),
    onSuccess: (session) => {
      rememberSession(session)
      navigate(`/r/${session.room.slug}`)
    },
  })

  return (
    <main className="wrap narrow">
      <Link to="/" className="back-link">
        ‹ Home
      </Link>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault()
          join.mutate()
        }}
      >
        <Heading kind="person">Join a room</Heading>
        <Field
          id="join-code"
          label="Room code or link"
          required
          autoFocus
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="k7m2pqxa"
        />
        <Field
          id="join-password"
          label="Room password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Field
          id="join-me"
          label="Your name"
          required
          maxLength={40}
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          hint="Already in this room? Use the same name to continue as yourself."
        />
        <IconPicker
          label="Your animal (optional)"
          icons={PERSON_ICONS}
          value={form.my_icon}
          onChange={(my_icon) => setForm({ ...form, my_icon })}
        />
        {join.error && <p className="error">{join.error.message}</p>}
        <button className="primary" disabled={join.isPending}>
          {join.isPending ? 'Joining…' : 'Join room'}
        </button>
      </form>
    </main>
  )
}
