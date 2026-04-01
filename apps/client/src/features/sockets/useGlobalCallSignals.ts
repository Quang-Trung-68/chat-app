import { useEffect } from 'react'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { Socket } from 'socket.io-client'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { useIncomingCallStore } from '@/features/call/store/incomingCall.store'

type CallSignalPayload = {
  callId: string
  conversationId: string
  type: 'offer' | 'answer' | 'candidate'
  payload: string
  fromUserId: string
}

/**
 * Offer + ICE trước khi người nghe mở đúng thread DM — useVoiceCall chỉ mount trong ChatThread.
 */
export function useGlobalCallSignals(socket: Socket | null, connected: boolean) {
  const userId = useAuthStore((s) => s.user?.id)

  useEffect(() => {
    if (!socket || !connected || !userId) return

    const onSignal = (data: CallSignalPayload) => {
      if (data.fromUserId === userId) return

      if (data.type === 'offer') {
        useIncomingCallStore.getState().setOffer({
          conversationId: data.conversationId,
          callId: data.callId,
          sdp: data.payload,
          fromUserId: data.fromUserId,
        })
        return
      }

      if (data.type === 'candidate') {
        try {
          const init = JSON.parse(data.payload) as RTCIceCandidateInit
          const pending = useIncomingCallStore.getState().offer
          if (pending && data.callId === pending.callId) {
            useIncomingCallStore.getState().pushIceForCall(data.callId, init)
          }
        } catch {
          /* ignore */
        }
      }
    }

    const onEnd = (data: { callId: string; conversationId: string; fromUserId: string }) => {
      if (data.fromUserId === userId) return
      const o = useIncomingCallStore.getState().offer
      if (o && o.callId === data.callId && o.conversationId === data.conversationId) {
        useIncomingCallStore.getState().clearOffer()
      }
    }

    socket.on(SOCKET_EVENTS.CALL_SIGNAL, onSignal)
    socket.on(SOCKET_EVENTS.CALL_END, onEnd)
    return () => {
      socket.off(SOCKET_EVENTS.CALL_SIGNAL, onSignal)
      socket.off(SOCKET_EVENTS.CALL_END, onEnd)
    }
  }, [socket, connected, userId])
}
