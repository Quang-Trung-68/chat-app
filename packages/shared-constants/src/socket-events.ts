/**
 * Tên event Socket.IO — khớp server (`apps/server/src/features/sockets/`) và client.
 */
export const SOCKET_EVENTS = {
  CHAT_SEND: 'chat:send',
  CHAT_NEW: 'chat:new',
  CHAT_ERROR: 'chat:error',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  /** Client → server: đánh dấu đã đọc tới hiện tại trong room. */
  ROOM_READ: 'room:read',
  /** Server → room: ai đó vừa cập nhật lastReadAt (tick / refresh unread). */
  RECEIPT_READ: 'receipt:read',
} as const

export type SocketEventKey = keyof typeof SOCKET_EVENTS
export type SocketEventValue = (typeof SOCKET_EVENTS)[SocketEventKey]
