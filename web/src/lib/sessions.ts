export type SavedRoom = { slug: string; name: string; token: string; me: string }

const KEY = 'tea-ceremony:rooms'

export function savedRooms(): SavedRoom[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(rooms: SavedRoom[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rooms))
  } catch {
    // Private mode or full storage: the session simply won't survive a reload.
  }
}

export function saveRoom(room: SavedRoom) {
  write([room, ...savedRooms().filter((r) => r.slug !== room.slug)])
}

export function forgetRoom(slug: string) {
  write(savedRooms().filter((r) => r.slug !== slug))
}

export function tokenFor(slug: string): string | null {
  return savedRooms().find((r) => r.slug === slug)?.token ?? null
}
