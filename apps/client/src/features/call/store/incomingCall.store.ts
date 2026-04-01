import { create } from 'zustand'

export type PendingVoiceOffer = {
  conversationId: string
  callId: string
  sdp: string
  fromUserId: string
}

type IncomingCallState = {
  offer: PendingVoiceOffer | null
  iceCandidatesByCallId: Record<string, RTCIceCandidateInit[]>
  setOffer: (o: PendingVoiceOffer) => void
  clearOffer: () => void
  pushIceForCall: (callId: string, init: RTCIceCandidateInit) => void
  takeIceForCall: (callId: string) => RTCIceCandidateInit[]
}

export const useIncomingCallStore = create<IncomingCallState>((set, get) => ({
  offer: null,
  iceCandidatesByCallId: {},

  setOffer: (o) => set({ offer: o }),

  clearOffer: () => set({ offer: null }),

  pushIceForCall: (callId, init) => {
    set((s) => {
      const prev = s.iceCandidatesByCallId[callId] ?? []
      return {
        iceCandidatesByCallId: { ...s.iceCandidatesByCallId, [callId]: [...prev, init] },
      }
    })
  },

  takeIceForCall: (callId) => {
    const list = get().iceCandidatesByCallId[callId] ?? []
    set((s) => {
      const next = { ...s.iceCandidatesByCallId }
      delete next[callId]
      return { iceCandidatesByCallId: next }
    })
    return list
  },
}))
