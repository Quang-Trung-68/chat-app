import type { Server } from 'socket.io'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'

export function emitPinsUpdatedToRoom(io: Server, conversationId: string): void {
  io.to(conversationId).emit(SOCKET_EVENTS.ROOM_PINS_UPDATED, { conversationId })
}
