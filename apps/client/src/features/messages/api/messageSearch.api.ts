import { api } from '@/services/api'

export type MessageSearchHitDto = {
  messageId: string
  conversationId: string
  content: string
  snippet: string
  createdAt: string
  conversationLabel: string
  sender: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  isSentByViewer: boolean
}

export type MessageSearchPageDto = {
  items: MessageSearchHitDto[]
  nextCursor: string | null
  hasMore: boolean
}

export async function fetchGlobalMessageSearch(
  q: string,
  cursor?: string,
  limit = 15
): Promise<MessageSearchPageDto> {
  const params = new URLSearchParams()
  params.set('q', q)
  if (cursor) params.set('cursor', cursor)
  params.set('limit', String(limit))
  const { data } = await api.get<{ success: boolean; data: MessageSearchPageDto }>(
    `/search/messages?${params}`
  )
  return data.data
}

export async function fetchRoomMessageSearch(
  conversationId: string,
  q: string,
  cursor?: string,
  limit = 15
): Promise<MessageSearchPageDto> {
  const params = new URLSearchParams()
  params.set('q', q)
  if (cursor) params.set('cursor', cursor)
  params.set('limit', String(limit))
  const { data } = await api.get<{ success: boolean; data: MessageSearchPageDto }>(
    `/rooms/${conversationId}/messages/search?${params}`
  )
  return data.data
}
