import type { Server, Socket } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { typingConversationPayloadSchema } from '@/features/messages/messages.validation'
import { roomsService } from '@/features/rooms/rooms.service'
import { AppError } from '@/shared/errors/AppError'
import { emitReceiptReadToRoom } from './receiptBroadcast'

type RoomReadAck =
  | { ok: true; lastReadAt: string }
  | { ok: false; code: string; message: string }

export function registerRoomReadHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId

  socket.on(
    SOCKET_EVENTS.ROOM_READ,
    async (raw: unknown, ack?: (r: RoomReadAck) => void) => {
      const parsed = typingConversationPayloadSchema.safeParse(raw)
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Payload không hợp lệ'
        const err = { code: 'VALIDATION_ERROR' as const, message }
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, err)
        ack?.({ ok: false, ...err })
        return
      }

      const { conversationId } = parsed.data

      try {
        const lastReadAt = await roomsService.markRoomAsRead(userId, conversationId)
        emitReceiptReadToRoom(io, conversationId, userId, lastReadAt)
        ack?.({ ok: true, lastReadAt: lastReadAt.toISOString() })
      } catch (e) {
        if (e instanceof AppError) {
          const err = { code: e.code, message: e.message }
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, err)
          ack?.({ ok: false, ...err })
        } else {
          const internal = { code: 'INTERNAL_ERROR' as const, message: 'Lỗi server' }
          socket.emit(SOCKET_EVENTS.CHAT_ERROR, internal)
          ack?.({ ok: false, ...internal })
        }
      }
    }
  )
}
