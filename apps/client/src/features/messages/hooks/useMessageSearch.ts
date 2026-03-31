import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'
import {
  fetchGlobalMessageSearch,
  fetchRoomMessageSearch,
} from '@/features/messages/api/messageSearch.api'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function useMessageSearch(options: {
  mode: 'global' | 'room'
  conversationId: string | undefined
  /** Chuỗi gõ trong ô tìm (chưa debounce). */
  rawQuery: string
  /** Chỉ gọi API khi true (ví dụ ô đang focus). */
  enabled: boolean
}) {
  const { mode, conversationId, rawQuery, enabled } = options
  const debounced = useDebouncedValue(rawQuery.trim(), SEARCH_MESSAGES.DEBOUNCE_MS)
  const canSearch =
    enabled &&
    debounced.length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH &&
    (mode === 'global' || Boolean(conversationId))

  const query = useQuery({
    queryKey: ['messageSearch', mode, conversationId ?? '', debounced],
    queryFn: () =>
      mode === 'global'
        ? fetchGlobalMessageSearch(debounced)
        : fetchRoomMessageSearch(conversationId!, debounced),
    enabled: canSearch,
    staleTime: 30_000,
  })

  const showHint = useMemo(
    () => rawQuery.trim().length > 0 && rawQuery.trim().length < SEARCH_MESSAGES.MIN_QUERY_LENGTH,
    [rawQuery]
  )

  return {
    debouncedQuery: debounced,
    items: query.data?.items ?? [],
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isFetching,
    isError: query.isError,
    showHint,
    canSearch,
  }
}
