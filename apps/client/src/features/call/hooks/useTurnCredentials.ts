import { useQuery } from '@tanstack/react-query'
import { getTurnCredentials } from '../api/getTurnCredentials'

type Options = {
  enabled?: boolean
}

export function useTurnCredentials(options?: Options) {
  const enabled = options?.enabled ?? true

  const query = useQuery({
    queryKey: ['turn-credentials'],
    queryFn: getTurnCredentials,
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
    retry: 2,
    enabled,
  })

  return {
    iceServers: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
