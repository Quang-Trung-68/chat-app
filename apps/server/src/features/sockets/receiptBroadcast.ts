import type { Server } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'

export function emitReceiptReadToRoom(
  io: Server,
  conversationId: string,
  userId: string,
  lastReadAt: Date
): void {
  io.to(conversationId).emit(SOCKET_EVENTS.RECEIPT_READ, {
    conversationId,
    userId,
    lastReadAt: lastReadAt.toISOString(),
  })
}
