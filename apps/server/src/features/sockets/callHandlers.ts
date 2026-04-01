import type { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { prisma } from '@/config/prisma'
import { messagesRepository } from '@/features/messages/messages.repository'

const callSignalSchema = z.object({
  callId: z.string().min(8),
  conversationId: z.string().min(8),
  type: z.enum(['offer', 'answer', 'candidate']),
  payload: z.string(),
})

const callEndSchema = z.object({
  callId: z.string().min(8),
  conversationId: z.string().min(8),
})

async function canRelayDmCall(userId: string, conversationId: string): Promise<boolean> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, deletedAt: null, type: 'DM' },
    select: { id: true },
  })
  if (!conv) return false

  const n = await prisma.conversationParticipant.count({
    where: { conversationId, deletedAt: null },
  })
  if (n !== 2) return false

  const p = await messagesRepository.findParticipant(userId, conversationId)
  return Boolean(p)
}

export function registerCallHandlers(_io: Server, socket: Socket) {
  const userId = socket.data.userId as string

  socket.on(SOCKET_EVENTS.CALL_SIGNAL, async (raw: unknown) => {
    const parsed = callSignalSchema.safeParse(raw)
    if (!parsed.success) return

    const { conversationId, callId, type, payload } = parsed.data
    const ok = await canRelayDmCall(userId, conversationId)
    if (!ok) return

    socket.to(conversationId).emit(SOCKET_EVENTS.CALL_SIGNAL, {
      callId,
      conversationId,
      type,
      payload,
      fromUserId: userId,
    })
  })

  socket.on(SOCKET_EVENTS.CALL_END, async (raw: unknown) => {
    const parsed = callEndSchema.safeParse(raw)
    if (!parsed.success) return

    const { conversationId, callId } = parsed.data
    const ok = await canRelayDmCall(userId, conversationId)
    if (!ok) return

    socket.to(conversationId).emit(SOCKET_EVENTS.CALL_END, {
      callId,
      conversationId,
      fromUserId: userId,
    })
  })
}
