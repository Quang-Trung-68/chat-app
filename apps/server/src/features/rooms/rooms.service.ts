import type { MessageType } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { MAX_PINS_PER_CONVERSATION, SOCKET_EVENTS } from '@chat-app/shared-constants'
import { AppError } from '@/shared/errors/AppError'
import { friendsService } from '@/features/friends/friends.service'
import { messagesRepository } from '@/features/messages/messages.repository'
import { io } from '@/features/sockets/socketServer'
import { emitPinsUpdatedToRoom } from '@/features/sockets/pinsBroadcast'
import { roomsRepository } from './rooms.repository'
import type {
  CreateGroupBody,
  CreatedRoomDto,
  LastMessageDto,
  PinnedMessageItemDto,
  RoomListItemDto,
} from './rooms.types'

function mapMessageTypeToLastFileType(type: MessageType): LastMessageDto['fileType'] {
  if (type === 'IMAGE') return 'IMAGE'
  if (type === 'FILE') return 'DOCUMENT'
  return null
}

function previewFromPinnedMessageRow(m: {
  content: string | null
  type: MessageType
  attachments: { id: string }[]
}): string {
  const t = m.content?.trim()
  if (t) return t.length > 120 ? `${t.slice(0, 119)}…` : t
  if (m.attachments.length > 0 || m.type === 'IMAGE') return 'Ảnh'
  return '…'
}

export const roomsService = {
  async listRooms(userId: string): Promise<RoomListItemDto[]> {
    const membership = await roomsRepository.findMembershipRowsForUser(userId)
    const conversationIds = [...new Set(membership.map((m) => m.conversationId))]
    if (conversationIds.length === 0) return []

    const [conversations, participantRows, lastMessageMap] = await Promise.all([
      roomsRepository.findConversationsByIds(conversationIds),
      roomsRepository.findParticipantsForConversations(conversationIds),
      roomsRepository.findLastMessagePerConversation(conversationIds),
    ])

    const lastReadByConv = new Map(membership.map((m) => [m.conversationId, m.lastReadAt]))

    const participantsByConv = new Map<string, typeof participantRows>()
    for (const row of participantRows) {
      const list = participantsByConv.get(row.conversationId) ?? []
      list.push(row)
      participantsByConv.set(row.conversationId, list)
    }

    const unreadCounts = await Promise.all(
      conversationIds.map(async (cid) => {
        const lr = lastReadByConv.get(cid)
        if (!lr) return { cid, count: 0 }
        const count = await roomsRepository.countUnreadMessages(cid, lr)
        return { cid, count }
      })
    )
    const unreadMap = new Map(unreadCounts.map((u) => [u.cid, u.count]))

    const convById = new Map(conversations.map((c) => [c.id, c]))
    const items: RoomListItemDto[] = []

    for (const cid of conversationIds) {
      const conv = convById.get(cid)
      if (!conv) continue

      const parts = participantsByConv.get(cid) ?? []
      const last = lastMessageMap.get(cid)
      const unreadCount = unreadMap.get(cid) ?? 0

      items.push({
        id: conv.id,
        name: conv.name,
        type: conv.type,
        createdAt: conv.createdAt,
        participants: parts.map((p) => ({
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
          role: p.role,
        })),
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              senderId: last.senderId,
              createdAt: last.createdAt,
              fileType: mapMessageTypeToLastFileType(last.type),
            }
          : null,
        unreadCount,
      })
    }

    /** Hội thoại chưa có tin: dùng createdAt làm điểm mới — tránh coi là -1 và bị đẩy xuống cuối. */
    items.sort((a, b) => {
      const ta = a.lastMessage?.createdAt.getTime() ?? a.createdAt.getTime()
      const tb = b.lastMessage?.createdAt.getTime() ?? b.createdAt.getTime()
      if (tb !== ta) return tb - ta
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return items
  },

  async createGroup(userId: string, body: CreateGroupBody): Promise<CreatedRoomDto> {
    const uniqueParticipantIds = [...new Set(body.participantIds)]
    if (uniqueParticipantIds.length !== body.participantIds.length) {
      throw new AppError('participantIds không được trùng lặp', 400, 'VALIDATION_ERROR')
    }
    if (uniqueParticipantIds.includes(userId)) {
      throw new AppError('Không thể thêm chính mình vào participantIds', 400, 'VALIDATION_ERROR')
    }

    const users = await roomsRepository.findUsersByIds(uniqueParticipantIds)
    if (users.length !== uniqueParticipantIds.length) {
      throw new AppError('Một hoặc nhiều participant không tồn tại', 400, 'INVALID_PARTICIPANTS')
    }

    for (const pid of uniqueParticipantIds) {
      const rel = await friendsService.getRelationship(userId, pid)
      if (rel.status !== 'accepted') {
        throw new AppError(
          'Chỉ có thể thêm bạn bè (đã kết bạn) vào nhóm',
          403,
          'NOT_FRIENDS'
        )
      }
    }

    const { conversation, participants } = await roomsRepository.createGroupWithParticipants({
      name: body.name,
      creatorId: userId,
      memberIds: uniqueParticipantIds,
    })

    for (const uid of [userId, ...uniqueParticipantIds]) {
      io.to(`user:${uid}`).emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, {
        conversationId: conversation.id,
        sidebarHint: uid === userId ? null : 'Bạn vừa được thêm vào nhóm',
      })
    }

    return {
      id: conversation.id,
      name: conversation.name,
      type: conversation.type,
      createdAt: conversation.createdAt,
      participants: participants.map((p) => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        role: p.role,
      })),
    }
  },

  /**
   * Cập nhật `lastReadAt` (không ghi `MessageRead` per-message).
   * `lastReadAt = max(now, createdAt tin nhắn mới nhất)` để khớp unread.
   */
  async markRoomAsRead(userId: string, conversationId: string): Promise<Date> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong room này', 403, 'FORBIDDEN')
    }

    const latest = await roomsRepository.findLastMessageCreatedAt(conversationId)
    const now = new Date()
    const lastReadAt = new Date(Math.max(now.getTime(), latest?.getTime() ?? 0))

    await roomsRepository.updateParticipantLastReadAt(userId, conversationId, lastReadAt)
    return lastReadAt
  },

  async listPins(userId: string, conversationId: string): Promise<PinnedMessageItemDto[]> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong room này', 403, 'FORBIDDEN')
    }

    const rows = await roomsRepository.listPinnedMessagesForConversation(conversationId)
    return rows.map((r) => ({
      messageId: r.messageId,
      pinnedAt: r.pinnedAt,
      pinnedBy: {
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
      },
      sender: {
        id: r.message.sender.id,
        username: r.message.sender.username,
        displayName: r.message.sender.displayName,
        avatarUrl: r.message.sender.avatarUrl,
      },
      preview: previewFromPinnedMessageRow(r.message),
    }))
  },

  async pinMessage(userId: string, conversationId: string, messageId: string): Promise<void> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong room này', 403, 'FORBIDDEN')
    }

    const meta = await messagesRepository.findMessageMeta(messageId)
    if (!meta || meta.deletedAt !== null) {
      throw new AppError('Không tìm thấy tin nhắn', 404, 'NOT_FOUND')
    }
    if (meta.conversationId !== conversationId) {
      throw new AppError('Tin nhắn không thuộc room này', 400, 'INVALID_MESSAGE')
    }

    const existing = await roomsRepository.findPinnedRow(conversationId, messageId)
    if (existing) {
      throw new AppError('Tin đã được ghim', 409, 'ALREADY_PINNED')
    }

    const count = await roomsRepository.countPinnedInConversation(conversationId)
    if (count >= MAX_PINS_PER_CONVERSATION) {
      throw new AppError(`Tối đa ${MAX_PINS_PER_CONVERSATION} tin ghim mỗi hội thoại`, 400, 'PIN_LIMIT')
    }

    await roomsRepository.createPinnedMessage({
      conversationId,
      messageId,
      pinnedBy: userId,
    })
    emitPinsUpdatedToRoom(io, conversationId)
  },

  async unpinMessage(userId: string, conversationId: string, messageId: string): Promise<void> {
    const participant = await messagesRepository.findParticipant(userId, conversationId)
    if (!participant) {
      throw new AppError('Không có quyền trong room này', 403, 'FORBIDDEN')
    }

    const existing = await roomsRepository.findPinnedRow(conversationId, messageId)
    if (!existing) {
      throw new AppError('Tin chưa được ghim', 404, 'NOT_PINNED')
    }

    await roomsRepository.deletePinnedMessage(conversationId, messageId)
    emitPinsUpdatedToRoom(io, conversationId)
  },

  async transferGroupOwner(actorId: string, conversationId: string, newOwnerId: string): Promise<void> {
    if (actorId === newOwnerId) {
      throw new AppError('Chọn thành viên khác', 400, 'VALIDATION_ERROR')
    }
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null, type: 'GROUP' },
      select: { id: true },
    })
    if (!conv) {
      throw new AppError('Không tìm thấy nhóm', 404, 'NOT_FOUND')
    }
    const actor = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: actorId, deletedAt: null },
      select: { role: true },
    })
    if (!actor || actor.role !== 'OWNER') {
      throw new AppError('Chỉ quản trị viên mới thực hiện được', 403, 'FORBIDDEN')
    }
    const target = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: newOwnerId, deletedAt: null },
      select: { id: true },
    })
    if (!target) {
      throw new AppError('Thành viên không trong nhóm', 400, 'INVALID_MEMBER')
    }
    await prisma.$transaction([
      prisma.conversationParticipant.update({
        where: {
          conversationId_userId: { conversationId, userId: actorId },
        },
        data: { role: 'MEMBER' },
      }),
      prisma.conversationParticipant.update({
        where: {
          conversationId_userId: { conversationId, userId: newOwnerId },
        },
        data: { role: 'OWNER' },
      }),
    ])
    const userIds = await roomsRepository.listActiveParticipantUserIds(conversationId)
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, {
        conversationId,
        sidebarHint: null,
      })
    }
  },

  async disbandGroup(actorId: string, conversationId: string): Promise<void> {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, deletedAt: null, type: 'GROUP' },
      select: { id: true },
    })
    if (!conv) {
      throw new AppError('Không tìm thấy nhóm', 404, 'NOT_FOUND')
    }
    const membership = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: actorId, deletedAt: null },
      select: { role: true },
    })
    if (!membership || membership.role !== 'OWNER') {
      throw new AppError('Chỉ quản trị viên mới giải tán được nhóm', 403, 'FORBIDDEN')
    }
    const userIds = await roomsRepository.listActiveParticipantUserIds(conversationId)
    await roomsRepository.disbandGroupSoftDelete(conversationId)
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit(SOCKET_EVENTS.ROOM_LIST_UPDATED, {
        conversationId,
        sidebarHint: null,
      })
    }
  },
}
