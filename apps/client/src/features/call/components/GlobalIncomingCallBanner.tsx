import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/features/sockets/useSocket'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { userDisplayName } from '@/lib/userDisplay'
import { useIncomingCallStore } from '@/features/call/store/incomingCall.store'

/** Hiển thị khi có offer nhưng user chưa mở /chat/:conversationId tương ứng. */
export function GlobalIncomingCallBanner() {
  const { socket, connected } = useSocket()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const offer = useIncomingCallStore((s) => s.offer)
  const clearOffer = useIncomingCallStore((s) => s.clearOffer)
  const { data: rooms } = useRoomsQuery()

  const onCorrectChat = offer && pathname === `/chat/${offer.conversationId}`

  const peerLabel = useMemo(() => {
    if (!offer || !rooms || !currentUserId) return 'Cuộc gọi'
    const room = rooms.find((r) => r.id === offer.conversationId)
    if (!room) return 'Cuộc gọi'
    const p = room.participants.find((x) => x.id === offer.fromUserId)
    return p ? userDisplayName(p) : 'Cuộc gọi'
  }, [offer, rooms, currentUserId])

  if (!offer || onCorrectChat) return null

  const reject = () => {
    if (socket && connected) {
      socket.emit(SOCKET_EVENTS.CALL_END, {
        callId: offer.callId,
        conversationId: offer.conversationId,
        reason: 'decline',
        wasAnswered: false,
        initiatorId: offer.fromUserId,
      })
    }
    clearOffer()
  }

  const goAnswer = () => {
    navigate(`/chat/${offer.conversationId}`)
  }

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[110] flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d1a2d] px-4 py-3 text-white shadow-lg"
      role="alert"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600/90">
          <Phone className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Cuộc gọi đến</p>
          <p className="truncate text-xs text-white/75">{peerLabel}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="text-foreground"
          onClick={reject}
        >
          <PhoneOff className="mr-1 h-4 w-4" />
          Từ chối
        </Button>
        <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={goAnswer}>
          Mở chat
        </Button>
      </div>
    </div>
  )
}
