import type { Server, Socket } from 'socket.io'
import { typingConversationPayloadSchema } from '@/features/messages/messages.validation'
import { messagesRepository } from '@/features/messages/messages.repository'
import { getRedisCache } from '@/config/redis'
import { presenceUserKey } from '@/features/push/presence.util'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'

const TYPING_TTL_SEC = 3
const LEGACY_PRESENCE_COUNTER_PREFIX = 'presence:user:'
/** Redis key: typing trong conversation. */
function typingKey(conversationId: string, userId: string): string {
  return `typing:${conversationId}:${userId}`
}

export function registerTypingPresenceHandlers(socket: Socket) {
  const userId = socket.data.userId

  socket.on('typing:start', async (raw: unknown) => {
    const parsed = typingConversationPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Payload không hợp lệ'
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        code: 'VALIDATION_ERROR' as const,
        message,
      })
      return
    }
    const { conversationId } = parsed.data

    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        code: 'FORBIDDEN' as const,
        message: 'Không có quyền trong room này',
      })
      return
    }

    const redis = getRedisCache()
    await redis.setex(typingKey(conversationId, userId), TYPING_TTL_SEC, '1')

    socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.TYPING_START, {
      conversationId,
      userId,
    })
  })

  socket.on('typing:stop', async (raw: unknown) => {
    const parsed = typingConversationPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Payload không hợp lệ'
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        code: 'VALIDATION_ERROR' as const,
        message,
      })
      return
    }
    const { conversationId } = parsed.data

    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        code: 'FORBIDDEN' as const,
        message: 'Không có quyền trong room này',
      })
      return
    }

    const redis = getRedisCache()
    await redis.del(typingKey(conversationId, userId))

    socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.TYPING_STOP, {
      conversationId,
      userId,
    })
  })
}

/**
 * Đăng ký socket vào SET; lần kết nối đầu tiên → broadcast `presence:online`.
 * Dùng SET theo `socket.id` thay cho INCR/DECR để tránh race async (counter > 0 khi không còn socket).
 */
export async function onSocketPresenceConnect(io: Server, socket: Socket, userId: string): Promise<void> {
  const redis = getRedisCache()
  const key = presenceUserKey(userId)
  await redis.del(`${LEGACY_PRESENCE_COUNTER_PREFIX}${userId}`)
  const before = await redis.scard(key)
  await redis.sadd(key, socket.id)
  const after = await redis.scard(key)
  if (before === 0 && after > 0) {
    io.emit(SOCKET_EVENTS.PRESENCE_ONLINE, { userId })
  }
}

/**
 * Gỡ socket khỏi SET; khi không còn socket → broadcast `presence:offline`.
 */
export async function onSocketPresenceDisconnect(io: Server, socket: Socket, userId: string): Promise<void> {
  const redis = getRedisCache()
  const key = presenceUserKey(userId)
  await redis.srem(key, socket.id)
  const after = await redis.scard(key)
  if (after === 0) {
    await redis.del(key)
    io.emit(SOCKET_EVENTS.PRESENCE_OFFLINE, { userId })
  }
}
