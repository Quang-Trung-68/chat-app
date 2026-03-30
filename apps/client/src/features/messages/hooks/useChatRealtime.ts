import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { MessageItemDto } from '../types/message.types'
import { useRealtimeMessagesStore } from '../store/realtimeMessages.store'

type ChatNewPayload = {
  conversationId: string
  message: MessageItemDto
}

type ChatErrorPayload = {
  code: string
  message: string
}

function normalizeMessage(m: MessageItemDto): MessageItemDto {
  return {
    ...m,
    createdAt:
      typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
  }
}

/**
 * Lắng nghe `chat:new` / `chat:error`, cập nhật Zustand (không refetch API).
 * Dùng chung một `socket` từ `useSocket()` (truyền từ `SocketBootstrap`).
 */
export function useChatRealtime(socket: Socket | null, connected: boolean) {
  const appendFromSocket = useRealtimeMessagesStore((s) => s.appendFromSocket)

  useEffect(() => {
    if (!socket || !connected) return

    const onNew = (payload: ChatNewPayload) => {
      if (!payload?.conversationId || !payload?.message) return
      appendFromSocket(payload.conversationId, normalizeMessage(payload.message))
    }

    const onError = (payload: ChatErrorPayload) => {
      if (import.meta.env.DEV) {
        console.warn('[chat:error]', payload?.code, payload?.message)
      }
    }

    socket.on(SOCKET_EVENTS.CHAT_NEW, onNew)
    socket.on(SOCKET_EVENTS.CHAT_ERROR, onError)

    return () => {
      socket.off(SOCKET_EVENTS.CHAT_NEW, onNew)
      socket.off(SOCKET_EVENTS.CHAT_ERROR, onError)
    }
  }, [socket, connected, appendFromSocket])
}
