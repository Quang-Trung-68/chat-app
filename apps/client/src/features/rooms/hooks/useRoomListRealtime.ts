import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { useRoomSidebarHintsStore } from '@/features/rooms/store/roomSidebarHints.store'

type RoomListUpdatedPayload = {
  conversationId: string
  sidebarHint: string | null
}

/**
 * Tạo nhóm / membership: server emit tới từng user → refetch danh sách phòng + gợi ý sidebar (người được thêm).
 */
export function useRoomListRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()
  const setHint = useRoomSidebarHintsStore((s) => s.setHint)

  useEffect(() => {
    if (!socket || !connected) return

    const onRoomListUpdated = (raw: unknown) => {
      const p = raw as RoomListUpdatedPayload
      if (!p?.conversationId) return
      if (p.sidebarHint) {
        setHint(p.conversationId, p.sidebarHint)
      }
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    }

    socket.on(SOCKET_EVENTS.ROOM_LIST_UPDATED, onRoomListUpdated)
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_LIST_UPDATED, onRoomListUpdated)
    }
  }, [socket, connected, queryClient, setHint])
}
