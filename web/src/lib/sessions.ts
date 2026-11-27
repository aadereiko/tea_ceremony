import type { Session } from './api'

export type SavedRoom = { slug: string; name: string; token: string; me: string; icon?: string }

const KEY = 'tea-ceremony:rooms'

export function savedRooms(): SavedRoom[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or full storage: the session simply won't survive a reload.
  }
}

export function saveRoom(room: SavedRoom) {
  write(KEY, [room, ...savedRooms().filter((r) => r.slug !== room.slug)])
}

export function forgetRoom(slug: string) {
  write(KEY, savedRooms().filter((r) => r.slug !== slug))
}

export function tokenFor(slug: string): string | null {
  return savedRooms().find((r) => r.slug === slug)?.token ?? null
}

export function updateSavedRoom(slug: string, changes: Partial<Omit<SavedRoom, 'slug'>>) {
  write(KEY, savedRooms().map((r) => (r.slug === slug ? { ...r, ...changes } : r)))
}

export function catalogToken(): string | null {
  return savedRooms()[0]?.token ?? null
}

export function rememberSession(session: Session) {
  saveRoom({
    slug: session.room.slug,
    name: session.room.name,
    icon: session.room.icon,
    token: session.token,
    me: session.me.display_name,
  })
  saveProfile({ name: session.me.display_name, icon: session.me.icon })
}

export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile)
}

export type Profile = { name: string; icon: string | null }

const PROFILE_KEY = 'tea-ceremony:profile'

export function savedProfile(): Profile {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null')
    if (typeof parsed?.name === 'string') return { name: parsed.name, icon: parsed.icon ?? null }
    // Browsers that joined rooms before profiles existed still know the name from the last room.
    return { name: savedRooms()[0]?.me ?? '', icon: null }
  } catch {
    return { name: '', icon: null }
  }
}
