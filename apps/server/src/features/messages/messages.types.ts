import type { MessageType } from '@prisma/client'

export type ApiFileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

/** JSON trong `Message` type CALL — đồng bộ `calls.service`. */
export type CallMessagePayloadDto = {
  callId: string
  callKind: 'audio' | 'video'
  outcome: 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'MISSED' | 'FAILED'
  durationSeconds: number | null
  initiatorId: string
}

export interface MessageSenderDto {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface MessageAttachmentDto {
  id: string
  url: string
  sortOrder: number
}

export interface ReactionSummaryDto {
  emoji: string
  count: number
}

/** Trích dẫn tin cha (reply) — gửi kèm mỗi message khi có `parentMessageId`. */
export interface ParentMessagePreviewDto {
  id: string
  /** Rút gọn nội dung; null nếu chỉ ảnh / không có chữ. */
  contentSnippet: string | null
  hasAttachments: boolean
  firstAttachmentUrl: string | null
  sender: MessageSenderDto
  isDeleted: boolean
}

/** Payload broadcast `chat:reaction:updated` — client gom summary + tính `myReactionEmoji` từ `reactions`. */
export interface ReactionUpdatedPayload {
  conversationId: string
  messageId: string
  summary: ReactionSummaryDto[]
  reactions: { userId: string; emoji: string }[]
}

export interface MessageItemDto {
  id: string
  /** Kiểu tin (TEXT, CALL, …) — client dùng để render. */
  messageType: MessageType
  content: string | null
  fileUrl: string | null
  fileType: ApiFileType | null
  /** Chỉ khi messageType === CALL — đã parse từ content JSON. */
  callPayload: CallMessagePayloadDto | null
  /** Ảnh đính kèm (Cloudinary); có thể rỗng nếu chỉ text hoặc chưa upload xong. */
  attachments: MessageAttachmentDto[]
  /** Gom theo emoji; viewer-specific qua `myReactionEmoji`. */
  reactionSummary: ReactionSummaryDto[]
  /** Reaction hiện tại của user đang xem (một user / một emoji / message). */
  myReactionEmoji: string | null
  createdAt: Date
  parentMessageId: string | null
  /** null nếu không reply hoặc không load được parent. */
  parentPreview: ParentMessagePreviewDto | null
  sender: MessageSenderDto
}

export interface MessagesPageDto {
  messages: MessageItemDto[]
  nextCursor: string | null
  hasMore: boolean
}

/** Một dòng kết quả tìm kiếm tin nhắn (global hoặc trong room). */
export interface MessageSearchHitDto {
  messageId: string
  conversationId: string
  /** Nội dung đầy đủ (text). */
  content: string
  /** Rút gọn để hiển thị. */
  snippet: string
  createdAt: string
  /** Tiêu đề hội thoại (nhóm / tên người DM). */
  conversationLabel: string
  sender: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  /** Tin do chính user gửi — UI có thể prefix "Bạn:". */
  isSentByViewer: boolean
}

export interface MessageSearchPageDto {
  items: MessageSearchHitDto[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreateMessageBody {
  content?: string
  fileUrl?: string
  fileType?: ApiFileType
  parentMessageId?: string
  /** Số ảnh user sẽ gửi tiếp theo (preview trong RAM); cho phép tin không text. */
  plannedImageCount?: number
}

/** Map persisted MessageType → API fileType (tin đơn lẻ legacy). */
export function messageTypeToApiFileType(type: MessageType): ApiFileType | null {
  if (type === 'IMAGE') return 'IMAGE'
  if (type === 'FILE') return 'DOCUMENT'
  if (type === 'CALL') return null
  return null
}

function parseCallPayloadJson(raw: string | null): CallMessagePayloadDto | null {
  if (!raw?.trim()) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const callId = typeof o.callId === 'string' ? o.callId : null
    const initiatorId = typeof o.initiatorId === 'string' ? o.initiatorId : null
    if (!callId || !initiatorId) return null
    const callKind = o.callKind === 'video' ? 'video' : 'audio'
    const outcome = o.outcome
    const allowed = new Set(['COMPLETED', 'DECLINED', 'CANCELLED', 'MISSED', 'FAILED'])
    if (typeof outcome !== 'string' || !allowed.has(outcome)) return null
    const ds = o.durationSeconds
    const durationSeconds =
      typeof ds === 'number' && Number.isFinite(ds) ? Math.max(0, Math.floor(ds)) : null
    return {
      callId,
      callKind,
      outcome: outcome as CallMessagePayloadDto['outcome'],
      durationSeconds,
      initiatorId,
    }
  } catch {
    return null
  }
}

export function buildCallPayloadForDto(m: {
  type: MessageType
  content: string | null
}): CallMessagePayloadDto | null {
  if (m.type !== 'CALL') return null
  return parseCallPayloadJson(m.content)
}
