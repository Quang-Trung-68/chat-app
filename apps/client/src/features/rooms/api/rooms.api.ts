import { api } from '@/services/api'

export async function disbandGroup(conversationId: string): Promise<void> {
  await api.delete<{ success: boolean; data: { ok: boolean } }>(`/rooms/${conversationId}`)
}

export async function transferGroupOwner(conversationId: string, newOwnerId: string): Promise<void> {
  await api.post<{ success: boolean; data: { ok: boolean } }>(`/rooms/${conversationId}/owner`, {
    newOwnerId,
  })
}
