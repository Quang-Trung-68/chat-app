import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import type { Socket } from 'socket.io-client'
import type { IceServer } from '../api/getTurnCredentials'
import { trimIceServers } from '../lib/trimIceServers'
import { useIncomingCallStore } from '../store/incomingCall.store'
import type { VoiceCallUiState } from '../types/voiceCall.types'
import { useCallAlertSounds } from './useCallAlertSounds'

export type { VoiceCallUiState } from '../types/voiceCall.types'

export type VoicePeerInfo = { id: string; displayName: string; avatarUrl: string | null }

type CallSignalPayload = {
  callId: string
  conversationId: string
  type: 'offer' | 'answer' | 'candidate'
  payload: string
  fromUserId: string
}

type CallEndPayload = { callId: string; conversationId: string; fromUserId: string }

function sdpJson(d: RTCSessionDescriptionInit): string {
  return JSON.stringify({ type: d.type, sdp: d.sdp })
}

function parseSdp(s: string): RTCSessionDescriptionInit {
  return JSON.parse(s) as RTCSessionDescriptionInit
}

export function formatCallDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export type UseVoiceCallArgs = {
  conversationId: string
  currentUserId: string | undefined
  socket: Socket | null
  socketConnected: boolean
  peer: VoicePeerInfo | null
  iceServers: IceServer[] | undefined
  turnLoading: boolean
}

export function useVoiceCall({
  conversationId,
  currentUserId,
  socket,
  socketConnected,
  peer,
  iceServers,
  turnLoading,
}: UseVoiceCallArgs) {
  const [uiState, setUiState] = useState<VoiceCallUiState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)

  useCallAlertSounds(uiState)

  const effectiveIce = useMemo(() => trimIceServers(iceServers), [iceServers])
  const globalOffer = useIncomingCallStore((s) => s.offer)

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callIdRef = useRef<string | null>(null)
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([])
  const pendingOfferRef = useRef<{ callId: string; sdp: string; fromUserId: string } | null>(null)
  const endCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const conversationIdRef = useRef(conversationId)
  const currentUserIdRef = useRef(currentUserId)
  conversationIdRef.current = conversationId
  currentUserIdRef.current = currentUserId

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    iceQueueRef.current = []
    pendingOfferRef.current = null
    callIdRef.current = null
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    setIsMuted(false)
  }, [])

  const emitEnd = useCallback(
    (callId: string) => {
      if (!socket || !socketConnected) return
      socket.emit(SOCKET_EVENTS.CALL_END, { callId, conversationId: conversationIdRef.current })
    },
    [socket, socketConnected]
  )

  const resetIdle = useCallback(() => {
    if (endCloseTimerRef.current) {
      clearTimeout(endCloseTimerRef.current)
      endCloseTimerRef.current = null
    }
    cleanupMedia()
    setUiState('idle')
    setError(null)
    setCallSeconds(0)
  }, [cleanupMedia])

  const showCallEndedAndClose = useCallback(() => {
    cleanupMedia()
    setUiState('ended')
    if (endCloseTimerRef.current) clearTimeout(endCloseTimerRef.current)
    endCloseTimerRef.current = setTimeout(() => {
      endCloseTimerRef.current = null
      resetIdle()
    }, 1500)
  }, [cleanupMedia, resetIdle])

  const endCall = useCallback(() => {
    const id = callIdRef.current
    if (id) emitEnd(id)
    const g = useIncomingCallStore.getState().offer
    if (g?.callId === id) useIncomingCallStore.getState().clearOffer()
    showCallEndedAndClose()
  }, [emitEnd, showCallEndedAndClose])

  const cancelOutgoing = useCallback(() => {
    const id = callIdRef.current
    if (id) emitEnd(id)
    const g = useIncomingCallStore.getState().offer
    if (g?.callId === id) useIncomingCallStore.getState().clearOffer()
    resetIdle()
  }, [emitEnd, resetIdle])

  const flushIceQueue = useCallback(async (pc: RTCPeerConnection) => {
    const q = iceQueueRef.current
    iceQueueRef.current = []
    for (const init of q) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(init))
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (uiState !== 'connected') {
      setCallSeconds(0)
      return
    }
    setCallSeconds(0)
    const tid = window.setInterval(() => {
      setCallSeconds((sec) => sec + 1)
    }, 1000)
    return () => clearInterval(tid)
  }, [uiState])

  useEffect(() => {
    if (!globalOffer || globalOffer.conversationId !== conversationId) return
    if (globalOffer.fromUserId === currentUserId) return
    if (pcRef.current) return

    pendingOfferRef.current = {
      callId: globalOffer.callId,
      sdp: globalOffer.sdp,
      fromUserId: globalOffer.fromUserId,
    }
    const extra = useIncomingCallStore.getState().takeIceForCall(globalOffer.callId)
    for (const c of extra) iceQueueRef.current.push(c)
    useIncomingCallStore.getState().clearOffer()
    setUiState('incoming')
  }, [globalOffer, conversationId, currentUserId])

  const startOutgoing = useCallback(async () => {
    if (!socket || !socketConnected || !currentUserId || !peer) return
    if (turnLoading || !effectiveIce.length) {
      setError('Đang chuẩn bị máy chủ cuộc gọi. Thử lại sau vài giây.')
      return
    }
    setError(null)
    const callId = crypto.randomUUID()
    callIdRef.current = callId

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setError('Không thể truy cập micro. Kiểm tra quyền trình duyệt.')
      callIdRef.current = null
      return
    }
    localStreamRef.current = stream

    const pc = new RTCPeerConnection({ iceServers: effectiveIce })
    pcRef.current = pc

    stream.getTracks().forEach((t) => pc.addTrack(t, stream))

    pc.onicecandidate = (e) => {
      if (!e.candidate || !callIdRef.current) return
      socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
        callId: callIdRef.current,
        conversationId: conversationIdRef.current,
        type: 'candidate',
        payload: JSON.stringify(e.candidate.toJSON()),
      })
    }

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0]
      }
    }

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
        callId,
        conversationId,
        type: 'offer',
        payload: sdpJson(offer),
      })
      setUiState('outgoing')
    } catch {
      setError('Không thể bắt đầu cuộc gọi.')
      cleanupMedia()
      setUiState('idle')
    }
  }, [
    socket,
    socketConnected,
    currentUserId,
    peer,
    turnLoading,
    effectiveIce,
    conversationId,
    cleanupMedia,
  ])

  const acceptIncoming = useCallback(async () => {
    const pending = pendingOfferRef.current
    if (!socket || !socketConnected || !currentUserId || !peer || !pending) return
    if (!effectiveIce.length) {
      setError('Chưa có máy chủ TURN.')
      return
    }
    setError(null)
    const pendingCallId = pending.callId
    callIdRef.current = pendingCallId
    pendingOfferRef.current = null

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setError('Không thể truy cập micro.')
      callIdRef.current = null
      return
    }
    localStreamRef.current = stream

    const pc = new RTCPeerConnection({ iceServers: effectiveIce })
    pcRef.current = pc

    stream.getTracks().forEach((t) => pc.addTrack(t, stream))

    pc.onicecandidate = (e) => {
      if (!e.candidate || !callIdRef.current) return
      socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
        callId: callIdRef.current,
        conversationId: conversationIdRef.current,
        type: 'candidate',
        payload: JSON.stringify(e.candidate.toJSON()),
      })
    }

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0]
      }
    }

    try {
      await pc.setRemoteDescription(parseSdp(pending.sdp))
      await flushIceQueue(pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit(SOCKET_EVENTS.CALL_SIGNAL, {
        callId: pendingCallId,
        conversationId,
        type: 'answer',
        payload: sdpJson(answer),
      })
      setUiState('connected')
    } catch {
      setError('Không thể trả lời cuộc gọi.')
      emitEnd(pendingCallId)
      cleanupMedia()
      setUiState('idle')
    }
  }, [
    socket,
    socketConnected,
    currentUserId,
    peer,
    effectiveIce,
    conversationId,
    flushIceQueue,
    emitEnd,
    cleanupMedia,
  ])

  const rejectIncoming = useCallback(() => {
    const p = pendingOfferRef.current
    pendingOfferRef.current = null
    const g = useIncomingCallStore.getState().offer
    if (g && p && g.callId === p.callId) useIncomingCallStore.getState().clearOffer()
    if (p) emitEnd(p.callId)
    resetIdle()
  }, [emitEnd, resetIdle])

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current
    if (!s) return
    const next = !isMuted
    s.getAudioTracks().forEach((t) => {
      t.enabled = !next
    })
    setIsMuted(next)
  }, [isMuted])

  useEffect(() => {
    if (!socket) return

    const onSignal = async (data: CallSignalPayload) => {
      if (data.conversationId !== conversationIdRef.current) return
      if (data.fromUserId === currentUserIdRef.current) return

      if (data.type === 'offer') {
        return
      }

      const pc = pcRef.current
      if (!pc || data.callId !== callIdRef.current) {
        if (data.type === 'candidate' && data.callId === pendingOfferRef.current?.callId) {
          try {
            iceQueueRef.current.push(JSON.parse(data.payload) as RTCIceCandidateInit)
          } catch {
            /* ignore */
          }
        }
        return
      }

      if (data.type === 'answer') {
        try {
          await pc.setRemoteDescription(parseSdp(data.payload))
          await flushIceQueue(pc)
          setUiState('connected')
        } catch {
          /* ignore */
        }
        return
      }

      if (data.type === 'candidate') {
        try {
          const init = JSON.parse(data.payload) as RTCIceCandidateInit
          if (!pc.remoteDescription) {
            iceQueueRef.current.push(init)
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(init))
          }
        } catch {
          /* ignore */
        }
      }
    }

    const onEnd = (data: CallEndPayload) => {
      if (data.conversationId !== conversationIdRef.current) return
      const active = callIdRef.current
      const pend = pendingOfferRef.current?.callId
      if (data.callId !== active && data.callId !== pend) return
      pendingOfferRef.current = null
      const g = useIncomingCallStore.getState().offer
      if (g && g.callId === data.callId) useIncomingCallStore.getState().clearOffer()
      showCallEndedAndClose()
    }

    socket.on(SOCKET_EVENTS.CALL_SIGNAL, onSignal)
    socket.on(SOCKET_EVENTS.CALL_END, onEnd)
    return () => {
      socket.off(SOCKET_EVENTS.CALL_SIGNAL, onSignal)
      socket.off(SOCKET_EVENTS.CALL_END, onEnd)
    }
  }, [socket, flushIceQueue, showCallEndedAndClose])

  useEffect(() => {
    return () => {
      const id = callIdRef.current
      if (id && socket) {
        socket.emit(SOCKET_EVENTS.CALL_END, {
          callId: id,
          conversationId: conversationIdRef.current,
        })
      }
      if (endCloseTimerRef.current) clearTimeout(endCloseTimerRef.current)
      cleanupMedia()
      setUiState('idle')
      setError(null)
    }
  }, [conversationId, socket, cleanupMedia])

  const callDurationLabel = uiState === 'connected' ? formatCallDuration(callSeconds) : null

  return {
    uiState,
    error,
    isMuted,
    callDurationLabel,
    remoteAudioRef,
    startOutgoing,
    acceptIncoming,
    rejectIncoming,
    endCall,
    cancelOutgoing,
    toggleMute,
  }
}
