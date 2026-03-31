import { api } from '@/services/api'
import { normalizeMessageSender, type MessageSenderPayload } from '@/lib/messageSender'
import type { PinnedMessageItem } from '../types/pinned.types'

function normalizeItem(p: PinnedMessageItem): PinnedMessageItem {
  return {
    ...p,
    pinnedAt: typeof p.pinnedAt === 'string' ? p.pinnedAt : new Date(p.pinnedAt).toISOString(),
    pinnedBy: normalizeMessageSender(p.pinnedBy as MessageSenderPayload),
    sender: normalizeMessageSender(p.sender as MessageSenderPayload),
  }
}

export async function fetchRoomPins(conversationId: string): Promise<PinnedMessageItem[]> {
  const { data } = await api.get<{ success: boolean; data: PinnedMessageItem[] }>(
    `/rooms/${conversationId}/pins`
  )
  return data.data.map(normalizeItem)
}

export async function pinRoomMessage(conversationId: string, messageId: string): Promise<void> {
  await api.post(`/rooms/${conversationId}/pins`, { messageId })
}

export async function unpinRoomMessage(conversationId: string, messageId: string): Promise<void> {
  await api.delete(`/rooms/${conversationId}/pins/${messageId}`)
}
