import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { roomsKeys } from '../rooms.keys'

/**
 * `receipt:read` từ server → invalidate danh sách room (unreadCount).
 */
export function useReceiptRealtime(socket: Socket | null, connected: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket || !connected) return

    const onReceipt = () => {
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
    }

    socket.on(SOCKET_EVENTS.RECEIPT_READ, onReceipt)
    return () => {
      socket.off(SOCKET_EVENTS.RECEIPT_READ, onReceipt)
    }
  }, [socket, connected, queryClient])
}
