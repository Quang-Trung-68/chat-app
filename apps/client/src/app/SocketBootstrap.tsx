import { useSocket } from '@/features/sockets/useSocket'
import { useChatRealtime } from '@/features/messages/hooks/useChatRealtime'
import { useTypingPresenceRealtime } from '@/features/sockets/useTypingPresenceRealtime'
import { useReceiptRealtime } from '@/features/rooms/hooks/useReceiptRealtime'
import { useRoomReadSync } from '@/features/rooms/hooks/useRoomReadSync'

/** Một kết nối Socket.IO + realtime chat + typing/presence + read receipts (Bước 6–9). */
export function SocketBootstrap() {
  const { socket, connected } = useSocket()
  useChatRealtime(socket, connected)
  useTypingPresenceRealtime(socket, connected)
  useReceiptRealtime(socket, connected)
  /** `conversationId` truyền từ màn chat khi có UI room (Bước 10); `null` = không đánh dấu đọc. */
  useRoomReadSync(socket, connected, null)
  return null
}
