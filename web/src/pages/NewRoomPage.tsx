import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Field } from '../components/Field'
import { IconPicker } from '../components/IconPicker'
import { Heading } from '../components/KindIcon'
import { api } from '../lib/api'
import { PERSON_ICONS, ROOM_ICONS } from '../lib/icons'
import { rememberSession, savedProfile } from '../lib/sessions'
import { Toggle } from '../components/Toggle'

export function NewRoomPage() {
  const navigate = useNavigate()
  const [profile] = useState(savedProfile)
  const [form, setForm] = useState({
    name: '',
    password: '',
    display_name: profile.name,
    icon: null as string | null,
    my_icon: profile.icon,
    blind: true,
    anonymous: false,
    hide_scores: false,
  })
  const create = useMutation({
    mutationFn: () => api.createRoom(form),
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
          create.mutate()
        }}
      >
        <Heading kind="room">New room</Heading>
        <Field
          id="create-name"
          label="Room name"
          required
          autoFocus
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Advent calendar 2026"
        />
        <IconPicker
          label="Room icon"
          icons={ROOM_ICONS}
          value={form.icon}
          onChange={(icon) => setForm({ ...form, icon })}
        />
        <Field
          id="create-password"
          label="Room password"
          type="password"
          required
          minLength={4}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          hint="Everyone joining needs it. At least 4 characters."
        />
        <Field
          id="create-me"
          label="Your name"
          required
          maxLength={40}
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        />
        <IconPicker
          label="Your animal"
          icons={PERSON_ICONS}
          value={form.my_icon}
          onChange={(my_icon) => setForm({ ...form, my_icon })}
        />
        <small className="muted">Skip the icons and we'll pick some for you.</small>
        <Toggle
          id="create-blind"
          label="Blind tasting"
          hint="Teas show as “Mystery tea” until someone reveals them."
          checked={form.blind}
          onChange={(blind) => setForm({ ...form, blind })}
        />
        <Toggle
          id="create-anonymous"
          label="Anonymous ratings"
          hint="Nobody sees who gave which score or note."
          checked={form.anonymous}
          onChange={(anonymous) => setForm({ ...form, anonymous, hide_scores: anonymous })}
        />
        <Toggle
          id="create-hide-scores"
          label="Hide scores until revealed"
          hint="Scores stay hidden until someone reveals them for each tea, so nobody is swayed by the others. On by default for anonymous ratings."
          checked={form.hide_scores}
          onChange={(hide_scores) => setForm({ ...form, hide_scores })}
        />
        {create.error && <p className="error">{create.error.message}</p>}
        <button className="primary" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create room'}
        </button>
      </form>
    </main>
  )
}
