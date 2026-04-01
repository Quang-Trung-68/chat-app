import { create } from 'zustand'

type State = {
  hints: Record<string, string>
  setHint: (conversationId: string, text: string) => void
  clearHint: (conversationId: string) => void
}

export const useRoomSidebarHintsStore = create<State>((set) => ({
  hints: {},
  setHint: (conversationId, text) =>
    set((s) => ({ hints: { ...s.hints, [conversationId]: text } })),
  clearHint: (conversationId) =>
    set((s) => {
      const next = { ...s.hints }
      delete next[conversationId]
      return { hints: next }
    }),
}))
