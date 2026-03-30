import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'

export function emitTypingStart(socket: Socket | null, conversationId: string): void {
  socket?.emit(SOCKET_EVENTS.TYPING_START, { conversationId })
}

export function emitTypingStop(socket: Socket | null, conversationId: string): void {
  socket?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId })
}
