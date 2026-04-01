import type { ConversationType } from '@prisma/client'

export interface RoomParticipantDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  /** Chỉ có trong danh sách phòng (nhóm). */
  role?: 'OWNER' | 'MEMBER'
}

export interface LastMessageDto {
  id: string
  content: string | null
  senderId: string
  createdAt: Date
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
}

export interface RoomListItemDto {
  id: string
  name: string | null
  type: ConversationType
  createdAt: Date
  participants: RoomParticipantDto[]
  lastMessage: LastMessageDto | null
  unreadCount: number
}

export interface CreateGroupBody {
  name: string
  participantIds: string[]
}

export interface CreatedRoomDto {
  id: string
  name: string | null
  type: ConversationType
  createdAt: Date
  participants: RoomParticipantDto[]
}

export interface PinnedMessageItemDto {
  messageId: string
  pinnedAt: Date
  pinnedBy: RoomParticipantDto
  sender: RoomParticipantDto
  /** Snippet hiển thị (chữ rút gọn hoặc "Ảnh"). */
  preview: string
}
