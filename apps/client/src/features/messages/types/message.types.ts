/** Khớp payload `chat:new` / REST message item. */
export interface MessageSenderDto {
  id: string
  username: string
  /** Tên hiển thị — khớp server; fallback username nếu thiếu (socket cũ). */
  displayName?: string
  avatarUrl: string | null
}

export interface MessageAttachmentDto {
  id: string
  url: string
  sortOrder: number
}

export interface ReactionSummaryItem {
  emoji: string
  count: number
}

export interface ParentMessagePreviewDto {
  id: string
  contentSnippet: string | null
  hasAttachments: boolean
  firstAttachmentUrl: string | null
  sender: MessageSenderDto
  isDeleted: boolean
}

/** Khớp Prisma MessageType — mặc định TEXT khi API cũ không gửi. */
export type MessageTypeDto = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'CALL'

export type CallMessagePayloadDto = {
  callId: string
  callKind: 'audio' | 'video'
  outcome: 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'MISSED' | 'FAILED'
  durationSeconds: number | null
  initiatorId: string
}

export interface MessageItemDto {
  id: string
  messageType?: MessageTypeDto
  callPayload?: CallMessagePayloadDto | null
  content: string | null
  fileUrl: string | null
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | null
  attachments: MessageAttachmentDto[]
  reactionSummary: ReactionSummaryItem[]
  myReactionEmoji: string | null
  createdAt: string
  parentMessageId: string | null
  parentPreview: ParentMessagePreviewDto | null
  sender: MessageSenderDto
}
