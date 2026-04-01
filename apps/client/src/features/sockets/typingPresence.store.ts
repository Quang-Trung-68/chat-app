import { create } from 'zustand'

type TypingPresenceState = {
  /** userId → true khi đang online (toàn app). */
  presenceOnline: Record<string, true>
  /** conversationId → danh sách userId đang typing (theo event server). */
  typingByConversation: Record<string, string[]>
  setPresenceOnline: (userId: string) => void
  setPresenceOffline: (userId: string) => void
  /** Thay thế map online theo snapshot server (sau socket connect / reconnect). */
  syncPresenceOnline: (userIds: string[]) => void
  addTyping: (conversationId: string, userId: string) => void
  removeTyping: (conversationId: string, userId: string) => void
  reset: () => void
}

function uniqAppend(list: string[], userId: string): string[] {
  if (list.includes(userId)) return list
  return [...list, userId]
}

export const useTypingPresenceStore = create<TypingPresenceState>((set) => ({
  presenceOnline: {},
  typingByConversation: {},
  setPresenceOnline: (userId) =>
    set((s) => ({
      presenceOnline: { ...s.presenceOnline, [userId]: true },
    })),
  setPresenceOffline: (userId) =>
    set((s) => {
      const next = { ...s.presenceOnline }
      delete next[userId]
      return { presenceOnline: next }
    }),
  syncPresenceOnline: (userIds) =>
    set({
      presenceOnline: Object.fromEntries(userIds.map((id) => [id, true as const])),
    }),
  addTyping: (conversationId, userId) =>
    set((s) => {
      const prev = s.typingByConversation[conversationId] ?? []
      return {
        typingByConversation: {
          ...s.typingByConversation,
          [conversationId]: uniqAppend(prev, userId),
        },
      }
    }),
  removeTyping: (conversationId, userId) =>
    set((s) => {
      const prev = s.typingByConversation[conversationId] ?? []
      const filtered = prev.filter((id) => id !== userId)
      const next = { ...s.typingByConversation }
      if (filtered.length === 0) delete next[conversationId]
      else next[conversationId] = filtered
      return { typingByConversation: next }
    }),
  reset: () => set({ presenceOnline: {}, typingByConversation: {} }),
}))
