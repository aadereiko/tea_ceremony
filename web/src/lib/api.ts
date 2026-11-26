export type Participant = { id: string; display_name: string; icon: string; is_owner: boolean }
export type Room = {
  slug: string
  name: string
  icon: string
  blind: boolean
  anonymous: boolean
  participants: Participant[]
}
export type Session = { token: string; room: Room; me: Participant }

export const SCORE_FIELDS = ['smell', 'taste', 'finish', 'overall'] as const
export type ScoreField = (typeof SCORE_FIELDS)[number]

export type RatingInput = Record<ScoreField, number | null> & {
  buy_again: boolean | null
  note: string
}
export type Rating = RatingInput & { participant: Participant | null; is_mine: boolean; updated_at: string }

export type IngredientRef = { id: string; name: string }
export type Ingredient = IngredientRef & { tea_count: number }

export type CatalogTea = {
  id: string
  name: string
  icon: string
  color: string | null
  notes: string
  ingredients: IngredientRef[]
  room_count: number
}
export type TeaInput = {
  name: string
  ingredients: string[]
  icon: string | null
  color: string | null
  notes: string
}

export type Tasting = {
  id: string
  tea: CatalogTea | null
  hidden: boolean
  added_by: Participant | null
  created_at: string
  rating_count: number
  average_overall: number | null
  my_rating: RatingInput | null
  scores_revealed: boolean
  ratings: Rating[] | null
}

export type Analytics = {
  anonymous: boolean
  tea_count: number
  rating_count: number
  ranking: {
    tasting_id: string
    hidden: boolean
    icon: string
    color: string | null
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
  createRoom: (body: {
    name: string
    password: string
    display_name: string
    icon: string | null
    my_icon: string | null
    blind: boolean
    anonymous: boolean
  }) =>
    request<Session>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  joinRoom: (slug: string, body: { password: string; display_name: string; my_icon: string | null }) =>
    request<Session>(`/api/rooms/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  room: (slug: string, token: string) => request<Session>(`/api/rooms/${slug}`, { token }),
  updateRoom: (slug: string, token: string, body: { icon?: string; blind?: boolean; anonymous?: boolean }) =>
    request<Session>(`/api/rooms/${slug}`, { method: 'PATCH', token, body: JSON.stringify(body) }),
  updateMe: (slug: string, token: string, body: { icon: string }) =>
    request<Session>(`/api/rooms/${slug}/me`, { method: 'PATCH', token, body: JSON.stringify(body) }),
  deleteRoom: (slug: string, token: string) =>
    request<void>(`/api/rooms/${slug}`, { method: 'DELETE', token }),
  teas: (slug: string, token: string) => request<Tasting[]>(`/api/rooms/${slug}/teas`, { token }),
  addTasting: (slug: string, token: string, body: { tea_id: string } | { new_tea: TeaInput }) =>
    request<Tasting>(`/api/rooms/${slug}/teas`, { method: 'POST', token, body: JSON.stringify(body) }),
  removeTasting: (slug: string, token: string, id: string) =>
    request<void>(`/api/rooms/${slug}/teas/${id}`, { method: 'DELETE', token }),
  setVisibility: (slug: string, token: string, id: string, body: { revealed?: boolean; scores_revealed?: boolean }) =>
    request<Tasting>(`/api/rooms/${slug}/teas/${id}/visibility`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),
  rate: (slug: string, token: string, id: string, body: RatingInput) =>
    request<Tasting>(`/api/rooms/${slug}/teas/${id}/rating`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),
  catalogTeas: (token: string) => request<CatalogTea[]>('/api/catalog/teas', { token }),
  createCatalogTea: (token: string, body: TeaInput) =>
    request<CatalogTea>('/api/catalog/teas', { method: 'POST', token, body: JSON.stringify(body) }),
  editCatalogTea: (token: string, id: string, body: TeaInput) =>
    request<CatalogTea>(`/api/catalog/teas/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),
  deleteCatalogTea: (token: string, id: string) =>
    request<void>(`/api/catalog/teas/${id}`, { method: 'DELETE', token }),
  ingredients: (token: string) => request<Ingredient[]>('/api/catalog/ingredients', { token }),
  renameIngredient: (token: string, id: string, name: string) =>
    request<{ ingredient: Ingredient; merged: boolean }>(`/api/catalog/ingredients/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name }),
    }),
  deleteIngredient: (token: string, id: string) =>
    request<void>(`/api/catalog/ingredients/${id}`, { method: 'DELETE', token }),
  analytics: (slug: string, token: string) =>
    request<Analytics>(`/api/rooms/${slug}/analytics`, { token }),
}

export function teaInput(tea: CatalogTea): TeaInput {
  return {
    name: tea.name,
    ingredients: tea.ingredients.map((i) => i.name),
    icon: tea.icon,
    color: tea.color,
    notes: tea.notes,
  }
}

export const MYSTERY = { name: 'Mystery tea', icon: 'mystery', color: null }

export function shownTea(tasting: Tasting, position: number) {
  return tasting.tea ?? { ...MYSTERY, name: `Mystery tea #${position}` }
}
