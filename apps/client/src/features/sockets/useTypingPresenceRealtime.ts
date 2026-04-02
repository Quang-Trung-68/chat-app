import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { useTypingPresenceStore } from './typingPresence.store'

type TypingPayload = { conversationId: string; userId: string }
type PresencePayload = { userId: string }
type PresenceSyncPayload = { userIds: string[] }

/**
 * Lắng nghe typing + presence; cập nhật Zustand; DEV log để verify Bước 8.
 * Gắn listener ngay khi có `socket` (không chờ `connected`) để không lỡ `presence:sync` gửi ngay sau handshake.
 */
export function useTypingPresenceRealtime(socket: Socket | null) {
  const setPresenceOnline = useTypingPresenceStore((s) => s.setPresenceOnline)
  const setPresenceOffline = useTypingPresenceStore((s) => s.setPresenceOffline)
  const syncPresenceOnline = useTypingPresenceStore((s) => s.syncPresenceOnline)
  const addTyping = useTypingPresenceStore((s) => s.addTyping)
  const removeTyping = useTypingPresenceStore((s) => s.removeTyping)

  useEffect(() => {
    if (!socket) return

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

    const onPresenceSync = (p: PresenceSyncPayload) => {
      const ids = Array.isArray(p?.userIds) ? p.userIds.filter((id): id is string => typeof id === 'string') : []
      syncPresenceOnline(ids)
      if (import.meta.env.DEV) {
        console.log('[Socket] presence:sync', ids.length, 'user(s)')
      }
    }

    socket.on(SOCKET_EVENTS.TYPING_START, onTypingStart)
    socket.on(SOCKET_EVENTS.TYPING_STOP, onTypingStop)
    socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, onPresenceOnline)
    socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, onPresenceOffline)
    socket.on(SOCKET_EVENTS.PRESENCE_SYNC, onPresenceSync)

    return () => {
      socket.off(SOCKET_EVENTS.TYPING_START, onTypingStart)
      socket.off(SOCKET_EVENTS.TYPING_STOP, onTypingStop)
      socket.off(SOCKET_EVENTS.PRESENCE_ONLINE, onPresenceOnline)
      socket.off(SOCKET_EVENTS.PRESENCE_OFFLINE, onPresenceOffline)
      socket.off(SOCKET_EVENTS.PRESENCE_SYNC, onPresenceSync)
    }
  }, [
    socket,
    addTyping,
    removeTyping,
    setPresenceOnline,
    setPresenceOffline,
    syncPresenceOnline,
  ])
}
