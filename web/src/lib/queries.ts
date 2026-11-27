import { useQuery } from '@tanstack/react-query'

import { api } from './api'

export function useCatalogTeas(token: string | null) {
  return useQuery({
    queryKey: ['catalog', 'teas'],
    queryFn: () => api.catalogTeas(token!),
    enabled: token !== null,
  })
}

export function useShops(token: string | null) {
  return useQuery({
    queryKey: ['shops'],
    queryFn: () => api.shops(token!),
    enabled: token !== null,
  })
}

export function useIngredients(token: string | null) {
  return useQuery({
    queryKey: ['catalog', 'ingredients'],
    queryFn: () => api.ingredients(token!),
    enabled: token !== null,
  })
}
