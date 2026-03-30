import type { Server, Socket } from 'socket.io'
import { typingConversationPayloadSchema } from '@/features/messages/messages.validation'
import { messagesRepository } from '@/features/messages/messages.repository'
import { getRedisCache } from '@/config/redis'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'

const TYPING_TTL_SEC = 3
/** Redis key: số kết nối socket đang mở của user (multi-tab). */
function presenceUserKey(userId: string): string {
  return `presence:user:${userId}`
}
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
 * Tăng bộ đếm kết nối; nếu lần đầu online → broadcast `presence:online`.
 */
export async function onSocketPresenceConnect(io: Server, userId: string): Promise<void> {
  const redis = getRedisCache()
  const n = await redis.incr(presenceUserKey(userId))
  if (n === 1) {
    io.emit(SOCKET_EVENTS.PRESENCE_ONLINE, { userId })
  }
}

/**
 * Giảm bộ đếm; khi về 0 → xóa key và broadcast `presence:offline`.
 */
export async function onSocketPresenceDisconnect(io: Server, userId: string): Promise<void> {
  const redis = getRedisCache()
  const key = presenceUserKey(userId)
  const n = await redis.decr(key)
  if (n <= 0) {
    await redis.del(key)
    if (n === 0) {
      io.emit(SOCKET_EVENTS.PRESENCE_OFFLINE, { userId })
    }
  }
}
