/** Khớp GET /api/rooms item (JSON). */
export interface RoomListItem {
  id: string
  name: string | null
  type: 'DM' | 'GROUP'
  createdAt: string
  participants: {
    id: string
    username: string
    displayName?: string
    avatarUrl: string | null
    /** Nhóm: OWNER = quản trị viên (người tạo nhóm). */
    role?: 'OWNER' | 'MEMBER'
  }[]
  lastMessage: {
    id: string
    content: string | null
    senderId: string
    createdAt: string
    fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
  } | null
  unreadCount: number
}
