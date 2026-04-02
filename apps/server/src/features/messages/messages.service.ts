import { MessageType as MT } from '@prisma/client'
import { uploadImageBufferToCloudinary, ensureCloudinaryConfigured } from '@/config/cloudinary.client'
import { getUploadConfig } from '@/config/upload.config'
import { AppError } from '@/shared/errors/AppError'
import { enqueueNotifyMessageJob } from '@/features/push/notifyMessage.queue'
import { messagesRepository } from './messages.repository'
import { messageSearchRepository, type MessageSearchRow } from './messageSearch.repository'
import {
  buildCallPayloadForDto,
  messageTypeToApiFileType,
  type CreateMessageBody,
  type MessageItemDto,
  type MessageSearchHitDto,
  type MessageSearchPageDto,
  type MessagesPageDto,
  type ParentMessagePreviewDto,
  type ReactionSummaryDto,
  type ReactionUpdatedPayload,
} from './messages.types'

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function reactionSummaryOnly(reactions: { userId: string; emoji: string; createdAt: Date }[]): ReactionSummaryDto[] {
  const byEmoji = new Map<string, { count: number; lastAt: number }>()
  for (const r of reactions) {
    const t = r.createdAt.getTime()
    const cur = byEmoji.get(r.emoji)
    if (!cur) {
      byEmoji.set(r.emoji, { count: 1, lastAt: t })
    } else {
      cur.count += 1
      if (t > cur.lastAt) cur.lastAt = t
    }
  }
  return [...byEmoji.entries()]
    .sort((a, b) => b[1].lastAt - a[1].lastAt || a[0].localeCompare(b[0]))
    .map(([emoji, { count }]) => ({ emoji, count }))
}

export function buildReactionSummaryFromRows(
  reactions: { userId: string; emoji: string; createdAt: Date }[],
  viewerId: string
): { reactionSummary: ReactionSummaryDto[]; myReactionEmoji: string | null } {
  return {
    reactionSummary: reactionSummaryOnly(reactions),
    myReactionEmoji: reactions.find((r) => r.userId === viewerId)?.emoji ?? null,
  }
}

function buildReactionBroadcastPayload(
  conversationId: string,
  messageId: string,
  reactions: { userId: string; emoji: string; createdAt: Date }[]
): ReactionUpdatedPayload {
  const summary = reactionSummaryOnly(reactions)
  const reactionsPayload = reactions.map(({ userId, emoji }) => ({ userId, emoji }))
  return {
    conversationId,
    messageId,
    summary,
    reactions: reactionsPayload,
  }
}

function snippetText(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function encodeSearchCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString('base64url')
}

function decodeSearchCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const o = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { t: string; id: string }
    if (!o.t || !o.id) throw new Error('bad')
    return { createdAt: new Date(o.t), id: o.id }
  } catch {
    throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
  }
}

function mapSearchRow(row: MessageSearchRow, viewerId: string): MessageSearchHitDto {
  const conversationLabel =
    row.conv_type === 'GROUP'
      ? row.group_name?.trim() || 'Nhóm'
      : row.dm_peer_display_name?.trim() || 'Hội thoại'
  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    content: row.content,
    snippet: snippetText(row.content, 220),
    createdAt: row.created_at.toISOString(),
    conversationLabel,
    sender: {
      id: row.sender_id,
      displayName: row.sender_display_name,
      avatarUrl: row.sender_avatar_url,
    },
    isSentByViewer: row.sender_id === viewerId,
  }
}

function buildParentPreview(parent: {
  id: string
  content: string | null
  fileUrl: string | null
  type: MT
  deletedAt: Date | null
  sender: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  attachments: { url: string }[]
}): ParentMessagePreviewDto {
  const isDeleted = parent.deletedAt !== null
  const firstUrl =
    parent.attachments[0]?.url ??
    (parent.fileUrl && parent.type === 'IMAGE' ? parent.fileUrl : null)
  const hasAttachments =
    Boolean(firstUrl) || parent.type === 'IMAGE' || parent.attachments.length > 0
  const contentSnippet =
    !isDeleted && parent.content?.trim() ? snippetText(parent.content.trim(), 88) : null
  return {
    id: parent.id,
    contentSnippet,
    hasAttachments,
    firstAttachmentUrl: firstUrl,
    sender: {
      id: parent.sender.id,
      username: parent.sender.username,
      displayName: parent.sender.displayName,
      avatarUrl: parent.sender.avatarUrl,
    },
    isDeleted,
  }
}

function resolveMessageType(body: CreateMessageBody): MT {
  const hasFile = body.fileUrl !== undefined && body.fileUrl.trim().length > 0
  if (hasFile) {
    if (body.fileType === 'IMAGE') return MT.IMAGE
    return MT.FILE
  }
  const planned = body.plannedImageCount ?? 0
  if (planned > 0) {
    const hasText = body.content !== undefined && body.content.trim().length > 0
    return hasText ? MT.TEXT : MT.IMAGE
  }
  return MT.TEXT
}

function mapRowToDto(
  m: {
    id: string
    content: string | null
    fileUrl: string | null
    type: MT
    createdAt: Date
    parentId: string | null
    parent: {
      id: string
      content: string | null
      fileUrl: string | null
      type: MT
      deletedAt: Date | null
      sender: {
        id: string
        username: string
        displayName: string
        avatarUrl: string | null
      }
      attachments: { url: string }[]
    } | null
    sender: {
      id: string
      username: string
      displayName: string
      avatarUrl: string | null
    }
    attachments: { id: string; url: string; sortOrder: number }[]
    reactions: { userId: string; emoji: string; createdAt: Date }[]
  },
  viewerId: string
): MessageItemDto {
  const { reactionSummary, myReactionEmoji } = buildReactionSummaryFromRows(m.reactions, viewerId)
  const parentPreview =
    m.parentId && m.parent ? buildParentPreview(m.parent) : null
  return {
    id: m.id,
    messageType: m.type,
    content: m.content,
    fileUrl: m.fileUrl,
    fileType: messageTypeToApiFileType(m.type),
    callPayload: buildCallPayloadForDto(m),
    attachments: m.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      sortOrder: a.sortOrder,
    })),
    reactionSummary,
    myReactionEmoji,
    createdAt: m.createdAt,
    parentMessageId: m.parentId,
    parentPreview,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      displayName: m.sender.displayName,
      avatarUrl: m.sender.avatarUrl,
    },
  }
}

export const messagesService = {
  mapRowToDto,

  async listMessages(
    userId: string,
    conversationId: string,
    query: { cursor?: string; limit: number }
  ): Promise<MessagesPageDto> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền truy cập room này', 403, 'FORBIDDEN')
    }

    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const cursorMsg = await messagesRepository.findMessageMeta(query.cursor)
      if (
        !cursorMsg ||
        cursorMsg.conversationId !== conversationId ||
        cursorMsg.deletedAt !== null
      ) {
        throw new AppError('Cursor không hợp lệ', 400, 'INVALID_CURSOR')
      }
      cursorCreatedAt = cursorMsg.createdAt
      cursorId = cursorMsg.id
    }

    const rows = await messagesRepository.findMessagesPage({
      conversationId,
      cursorCreatedAt,
      cursorId,
      limit: query.limit,
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const nextCursor =
      hasMore && slice.length > 0 ? slice[slice.length - 1].id : null

    const messages: MessageItemDto[] = slice.map((m) => mapRowToDto(m, userId))

    return { messages, nextCursor, hasMore }
  },

  async createMessage(
    userId: string,
    conversationId: string,
    body: CreateMessageBody
  ): Promise<MessageItemDto> {
    const cfg = getUploadConfig()
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền truy cập room này', 403, 'FORBIDDEN')
    }

    if (body.parentMessageId) {
      const parent = await messagesRepository.findMessageMeta(body.parentMessageId)
      if (
        !parent ||
        parent.conversationId !== conversationId ||
        parent.deletedAt !== null
      ) {
        throw new AppError('Tin nhắn reply không thuộc room này', 400, 'INVALID_PARENT_MESSAGE')
      }
    }

    const planned = body.plannedImageCount ?? 0
    if (planned > cfg.maxImagesPerMessage) {
      throw new AppError(
        `Tối đa ${cfg.maxImagesPerMessage} ảnh mỗi tin`,
        400,
        'PLANNED_IMAGES_EXCEEDED'
      )
    }

    if (body.plannedImageCount !== undefined && body.plannedImageCount < 0) {
      throw new AppError('plannedImageCount không hợp lệ', 400, 'VALIDATION_ERROR')
    }

    const type = resolveMessageType(body)
    const content =
      body.content !== undefined && body.content.trim().length > 0
        ? body.content.trim()
        : null

    const created = await messagesRepository.createMessage({
      conversationId,
      senderId: userId,
      type,
      content,
      fileUrl: body.fileUrl?.trim() ?? null,
      fileName: null,
      fileSize: null,
      parentId: body.parentMessageId ?? null,
    })

    void enqueueNotifyMessageJob({
      messageId: created.id,
      conversationId,
      senderId: userId,
    }).catch(() => {
      /* queue tùy chọn khi thiếu VAPID / Redis */
    })

    return mapRowToDto(created, userId)
  },

  async setReaction(
    userId: string,
    messageId: string,
    emoji: string
  ): Promise<{ payload: ReactionUpdatedPayload; myReactionEmoji: string | null }> {
    const meta = await messagesRepository.findMessageMeta(messageId)
    if (!meta || meta.deletedAt !== null) {
      throw new AppError('Không tìm thấy tin nhắn', 404, 'NOT_FOUND')
    }
    const conversationId = meta.conversationId
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong hội thoại này', 403, 'FORBIDDEN')
    }

    const existing = await messagesRepository.findReactionByMessageAndUser(messageId, userId)
    if (!existing) {
      await messagesRepository.createReaction(messageId, userId, emoji)
    } else if (existing.emoji === emoji) {
      await messagesRepository.deleteReactionById(existing.id)
    } else {
      await messagesRepository.updateReactionEmoji(existing.id, emoji)
    }

    const rows = await messagesRepository.listReactionsForMessage(messageId)
    const payload = buildReactionBroadcastPayload(conversationId, messageId, rows)
    const myReactionEmoji = rows.find((r) => r.userId === userId)?.emoji ?? null
    return { payload, myReactionEmoji }
  },

  async uploadMessageImages(
    userId: string,
    messageId: string,
    files: Express.Multer.File[]
  ): Promise<{ message: MessageItemDto; conversationId: string }> {
    if (!files.length) {
      throw new AppError('Không có file', 400, 'VALIDATION_ERROR')
    }

    const cfg = getUploadConfig()
    if (!ensureCloudinaryConfigured()) {
      throw new AppError('Chưa cấu hình Cloudinary', 503, 'CLOUDINARY_UNAVAILABLE')
    }

    const row = await messagesRepository.findMessageForUpload(messageId, userId)
    if (!row) {
      throw new AppError('Không tìm thấy tin nhắn hoặc không phải tin của bạn', 404, 'NOT_FOUND')
    }

    const conversationId = row.conversationId

    const remaining = cfg.maxImagesPerMessage - row._count.attachments
    if (remaining <= 0) {
      throw new AppError('Đã đủ số ảnh cho tin này', 400, 'ATTACHMENT_LIMIT')
    }
    if (files.length > remaining) {
      throw new AppError(
        `Chỉ còn chỗ cho ${remaining} ảnh`,
        400,
        'TOO_MANY_FILES'
      )
    }

    for (const f of files) {
      if (!IMAGE_MIMES.has(f.mimetype)) {
        throw new AppError(`Định dạng không hỗ trợ: ${f.mimetype}`, 400, 'INVALID_MIME')
      }
      if (f.size > cfg.maxImageBytesPerFile) {
        throw new AppError(
          `Ảnh vượt dung lượng (${cfg.maxImageBytesPerFile} bytes)`,
          400,
          'FILE_TOO_LARGE'
        )
      }
    }

    const folder = `chat/${conversationId}/${messageId}`
    const startOrder = row._count.attachments
    const uploads: { url: string; sortOrder: number }[] = []

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImageBufferToCloudinary(files[i].buffer, folder)
      uploads.push({ url, sortOrder: startOrder + i })
    }

    await messagesRepository.createAttachments(messageId, uploads)

    const full = await messagesRepository.findMessageByIdWithListShape(messageId)
    if (!full) {
      throw new AppError('Không tải lại được tin sau upload', 500, 'INTERNAL_ERROR')
    }

    return { message: mapRowToDto(full, userId), conversationId }
  },

  async searchMessagesGlobal(
    userId: string,
    query: { q: string; cursor?: string; limit: number }
  ): Promise<MessageSearchPageDto> {
    const needle = query.q.trim()
    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const c = decodeSearchCursor(query.cursor)
      cursorCreatedAt = c.createdAt
      cursorId = c.id
    }

    const rows = await messageSearchRepository.searchGlobal({
      userId,
      needle,
      limit: query.limit,
      cursorCreatedAt,
      cursorId,
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const last = slice[slice.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeSearchCursor(last.created_at, last.message_id)
        : null

    return {
      items: slice.map((r) => mapSearchRow(r, userId)),
      nextCursor,
      hasMore,
    }
  },

  async searchMessagesInRoom(
    userId: string,
    conversationId: string,
    query: { q: string; cursor?: string; limit: number }
  ): Promise<MessageSearchPageDto> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền truy cập room này', 403, 'FORBIDDEN')
    }

    const needle = query.q.trim()
    let cursorCreatedAt: Date | undefined
    let cursorId: string | undefined
    if (query.cursor) {
      const c = decodeSearchCursor(query.cursor)
      cursorCreatedAt = c.createdAt
      cursorId = c.id
    }

    const rows = await messageSearchRepository.searchInRoom({
      userId,
      conversationId,
      needle,
      limit: query.limit,
      cursorCreatedAt,
      cursorId,
    })

    const hasMore = rows.length > query.limit
    const slice = hasMore ? rows.slice(0, query.limit) : rows
    const last = slice[slice.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeSearchCursor(last.created_at, last.message_id)
        : null

    return {
      items: slice.map((r) => mapSearchRow(r, userId)),
      nextCursor,
      hasMore,
    }
  },
}
