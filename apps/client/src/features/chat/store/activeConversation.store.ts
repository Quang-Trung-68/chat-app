import { create } from 'zustand'

/** Room đang mở trên `/chat/:conversationId` — dùng cho tiêu đề / flash. */
type State = {
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void
}

export const useActiveConversationStore = create<State>((set) => ({
  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}))
