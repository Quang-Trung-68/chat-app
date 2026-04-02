import type { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { prisma } from '@/config/prisma'
import { messagesRepository } from '@/features/messages/messages.repository'
import { getRedisCache } from '@/config/redis'
import {
  finalizeDmCallAndBroadcast,
  getOtherDmParticipant,
  mapEndReasonToOutcome,
  type CallEndReason,
} from '@/features/calls/calls.service'

const callSignalSchema = z.object({
  callId: z.string().min(8),
  conversationId: z.string().min(8),
  type: z.enum(['offer', 'answer', 'candidate']),
  payload: z.string(),
})

const callEndSchema = z.object({
  callId: z.string().min(8),
  conversationId: z.string().min(8),
  reason: z.enum(['hangup', 'decline', 'cancel', 'timeout', 'failed']),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  wasAnswered: z.boolean(),
  initiatorId: z.string().min(8),
})

const SESSION_PREFIX = 'call:session:'
const SESSION_TTL_SEC = 3600

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

async function validateInitiatorInDm(conversationId: string, initiatorId: string): Promise<boolean> {
  const parts = await prisma.conversationParticipant.findMany({
    where: { conversationId, deletedAt: null },
    select: { userId: true },
  })
  if (parts.length !== 2) return false
  return parts.some((p) => p.userId === initiatorId)
}

type CallSession = {
  initiatorId: string
  conversationId: string
  peerUserId: string
  startedAt: number
  answeredAt: number | null
}

async function readSession(callId: string): Promise<CallSession | null> {
  const redis = getRedisCache()
  const raw = await redis.get(`${SESSION_PREFIX}${callId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CallSession
  } catch {
    return null
  }
}

async function writeSession(callId: string, data: CallSession): Promise<void> {
  const redis = getRedisCache()
  await redis.setex(`${SESSION_PREFIX}${callId}`, SESSION_TTL_SEC, JSON.stringify(data))
}

export function registerCallHandlers(io: Server, socket: Socket) {
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

    if (type === 'offer') {
      const peerUserId = await getOtherDmParticipant(conversationId, userId)
      let session = await readSession(callId)
      if (!session && peerUserId) {
        session = {
          initiatorId: userId,
          conversationId,
          peerUserId,
          startedAt: Date.now(),
          answeredAt: null,
        }
        await writeSession(callId, session)
      }
      if (peerUserId) {
        const sockets = await io.in(conversationId).fetchSockets()
        const peerInRoom = sockets.some(
          (s) => s.data.userId === peerUserId && s.id !== socket.id
        )
        if (peerInRoom) {
          socket.emit(SOCKET_EVENTS.CALL_RINGING, { callId, conversationId })
        }
      }
    }

    if (type === 'answer') {
      const session = await readSession(callId)
      if (session) {
        await writeSession(callId, { ...session, answeredAt: Date.now() })
      }
    }
  })

  socket.on(SOCKET_EVENTS.CALL_END, async (raw: unknown) => {
    const parsed = callEndSchema.safeParse(raw)
    if (!parsed.success) return

    const { conversationId, callId, reason, durationSeconds, wasAnswered, initiatorId } =
      parsed.data
    const ok = await canRelayDmCall(userId, conversationId)
    if (!ok) return

    const initiatorOk = await validateInitiatorInDm(conversationId, initiatorId)
    if (!initiatorOk) return

    socket.to(conversationId).emit(SOCKET_EVENTS.CALL_END, {
      callId,
      conversationId,
      fromUserId: userId,
    })

    const outcome = mapEndReasonToOutcome(reason as CallEndReason, wasAnswered)
    const dur =
      outcome === 'COMPLETED' && durationSeconds !== undefined ? durationSeconds : null

    await finalizeDmCallAndBroadcast(io, {
      conversationId,
      callId,
      initiatorId,
      outcome,
      durationSeconds: dur,
      callKind: 'audio',
    })
  })
}
