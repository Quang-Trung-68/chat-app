import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { useTypingPresenceStore } from './typingPresence.store'

type TypingPayload = { conversationId: string; userId: string }
type PresencePayload = { userId: string }

/**
 * Lắng nghe typing + presence; cập nhật Zustand; DEV log để verify Bước 8.
 */
export function useTypingPresenceRealtime(socket: Socket | null, connected: boolean) {
  const setPresenceOnline = useTypingPresenceStore((s) => s.setPresenceOnline)
  const setPresenceOffline = useTypingPresenceStore((s) => s.setPresenceOffline)
  const addTyping = useTypingPresenceStore((s) => s.addTyping)
  const removeTyping = useTypingPresenceStore((s) => s.removeTyping)

  useEffect(() => {
    if (!socket || !connected) return

    const onTypingStart = (p: TypingPayload) => {
      if (!p?.conversationId || !p?.userId) return
      addTyping(p.conversationId, p.userId)
      if (import.meta.env.DEV) {
        console.log('[Socket] typing:start', p)
      }
    }

    const onTypingStop = (p: TypingPayload) => {
      if (!p?.conversationId || !p?.userId) return
      removeTyping(p.conversationId, p.userId)
      if (import.meta.env.DEV) {
        console.log('[Socket] typing:stop', p)
      }
    }

    const onPresenceOnline = (p: PresencePayload) => {
      if (!p?.userId) return
      setPresenceOnline(p.userId)
      if (import.meta.env.DEV) {
        console.log('[Socket] presence:online', p)
      }
    }

    const onPresenceOffline = (p: PresencePayload) => {
      if (!p?.userId) return
      setPresenceOffline(p.userId)
      if (import.meta.env.DEV) {
        console.log('[Socket] presence:offline', p)
      }
    }

    socket.on(SOCKET_EVENTS.TYPING_START, onTypingStart)
    socket.on(SOCKET_EVENTS.TYPING_STOP, onTypingStop)
    socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, onPresenceOnline)
    socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, onPresenceOffline)

    return () => {
      socket.off(SOCKET_EVENTS.TYPING_START, onTypingStart)
      socket.off(SOCKET_EVENTS.TYPING_STOP, onTypingStop)
      socket.off(SOCKET_EVENTS.PRESENCE_ONLINE, onPresenceOnline)
      socket.off(SOCKET_EVENTS.PRESENCE_OFFLINE, onPresenceOffline)
    }
  }, [
    socket,
    connected,
    addTyping,
    removeTyping,
    setPresenceOnline,
    setPresenceOffline,
  ])
}
