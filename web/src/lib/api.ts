export type Participant = { id: string; display_name: string }
export type Room = { slug: string; name: string; participants: Participant[] }
export type Session = { token: string; room: Room; me: Participant }

export const SCORE_FIELDS = ['smell', 'taste', 'finish', 'overall'] as const
export type ScoreField = (typeof SCORE_FIELDS)[number]

export type RatingInput = Record<ScoreField, number | null> & {
  buy_again: boolean | null
  note: string
}
export type Rating = RatingInput & { participant: Participant; updated_at: string }

export type Tea = {
  id: string
  name: string
  ingredients: string[]
  notes: string
  created_by: Participant | null
  created_at: string
  rating_count: number
  average_overall: number | null
  my_rating: RatingInput | null
  ratings: Rating[] | null
}
export type TeaInput = { name: string; ingredients: string[]; notes: string }

export type Analytics = {
  tea_count: number
  rating_count: number
  ranking: {
    tea_id: string
    name: string
    rating_count: number
    average_overall: number | null
    average_by_field: Record<ScoreField, number | null>
    buy_again_yes: number
  }[]
  people: {
    participant: Participant
    rated: number
    average_overall: number | null
    average_by_field: Record<ScoreField, number | null>
  }[]
  ingredients: {
    ingredient: string
    teas: number
    relative_by_person: Record<string, number | null>
    relative_all: number | null
  }[]
  agreement: { a: Participant; b: Participant; shared_teas: number; mean_difference: number | null }[]
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init
  const res = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
  if (!res.ok) {
    let message = `Something went wrong (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg
    } catch {
      // The body wasn't JSON; keep the generic message.
    }
    throw new ApiError(res.status, message)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const api = {
  createRoom: (body: { name: string; password: string; display_name: string }) =>
    request<Session>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (slug: string, body: { password: string; display_name: string }) =>
    request<Session>(`/api/rooms/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  room: (slug: string, token: string) => request<Session>(`/api/rooms/${slug}`, { token }),
  teas: (slug: string, token: string) => request<Tea[]>(`/api/rooms/${slug}/teas`, { token }),
  addTea: (slug: string, token: string, body: TeaInput) =>
    request<Tea>(`/api/rooms/${slug}/teas`, { method: 'POST', token, body: JSON.stringify(body) }),
  editTea: (slug: string, token: string, id: string, body: TeaInput) =>
    request<Tea>(`/api/rooms/${slug}/teas/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),
  deleteTea: (slug: string, token: string, id: string) =>
    request<void>(`/api/rooms/${slug}/teas/${id}`, { method: 'DELETE', token }),
  rate: (slug: string, token: string, id: string, body: RatingInput) =>
    request<Tea>(`/api/rooms/${slug}/teas/${id}/rating`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),
  analytics: (slug: string, token: string) =>
    request<Analytics>(`/api/rooms/${slug}/analytics`, { token }),
}
