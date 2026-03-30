import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { api } from '@/services/api'
import { roomsKeys } from '../rooms.keys'

const DEBOUNCE_MS = 300

/**
 * Đánh dấu đã đọc room: PATCH `/api/rooms/:id/read` (debounce).
 * Gọi khi đổi room, focus cửa sổ, hoặc có `chat:new` trong room đang mở.
 * Kết hợp `useReceiptRealtime` để đồng bộ unread từ broadcast.
 */
export function useRoomReadSync(
  socket: Socket | null,
  connected: boolean,
  conversationId: string | null
) {
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convRef = useRef(conversationId)
  convRef.current = conversationId

  const flushMarkRead = useCallback(async () => {
    const id = convRef.current
    if (!id) return
    try {
      await api.patch(`/rooms/${id}/read`)
      await queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    } catch {
      if (connected && socket) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), 8000)
          socket.emit(
            SOCKET_EVENTS.ROOM_READ,
            { conversationId: id },
            (ack: { ok?: boolean } | undefined) => {
              clearTimeout(t)
              if (ack?.ok) resolve()
              else reject(new Error('ack'))
            }
          )
        })
        await queryClient.invalidateQueries({ queryKey: roomsKeys.all })
      }
    }
  }, [queryClient, socket, connected])

  const scheduleMarkRead = useCallback(() => {
    if (!convRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flushMarkRead()
    }, DEBOUNCE_MS)
  }, [flushMarkRead])

  useEffect(() => {
    if (!conversationId && timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [conversationId])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    scheduleMarkRead()
  }, [conversationId, scheduleMarkRead])

  useEffect(() => {
    if (!socket || !connected || !conversationId) return
    const onNew = (payload: { conversationId: string }) => {
      if (payload?.conversationId === conversationId) scheduleMarkRead()
    }
    socket.on(SOCKET_EVENTS.CHAT_NEW, onNew)
    return () => {
      socket.off(SOCKET_EVENTS.CHAT_NEW, onNew)
    }
  }, [socket, connected, conversationId, scheduleMarkRead])

  useEffect(() => {
    if (!conversationId) return
    const onFocus = () => scheduleMarkRead()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [conversationId, scheduleMarkRead])
}
