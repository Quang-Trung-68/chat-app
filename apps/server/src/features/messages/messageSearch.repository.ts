import { Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'

export type MessageSearchRow = {
  message_id: string
  conversation_id: string
  content: string
  created_at: Date
  sender_id: string
  sender_display_name: string
  sender_avatar_url: string | null
  conv_type: string
  group_name: string | null
  dm_peer_display_name: string | null
}

function searchMatchCondition(needle: string) {
  return Prisma.sql`position(unaccent(lower(${needle})) in unaccent(lower(m.content))) > 0`
}

function cursorCondition(
  cursorCreatedAt: Date | undefined,
  cursorId: string | undefined
) {
  if (!cursorCreatedAt || !cursorId) return Prisma.empty
  return Prisma.sql`AND (
    m.created_at < ${cursorCreatedAt}
    OR (m.created_at = ${cursorCreatedAt} AND m.id < ${cursorId})
  )`
}

export const messageSearchRepository = {
  async searchInRoom(params: {
    userId: string
    conversationId: string
    needle: string
    limit: number
    cursorCreatedAt?: Date
    cursorId?: string
  }): Promise<MessageSearchRow[]> {
    const { userId, conversationId, needle, limit, cursorCreatedAt, cursorId } = params
    const take = limit + 1

    const rows = await prisma.$queryRaw<MessageSearchRow[]>(Prisma.sql`
      SELECT
        m.id AS message_id,
        m.conversation_id,
        m.content,
        m.created_at,
        u.id AS sender_id,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        c.type::text AS conv_type,
        c.name AS group_name,
        dm_peer.display_name AS dm_peer_display_name
      FROM messages m
      INNER JOIN users u ON u.id = m.sender_id
      INNER JOIN conversations c ON c.id = m.conversation_id AND c.deleted_at IS NULL
      INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        AND cp.user_id = ${userId}
        AND cp.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT u2.display_name
        FROM conversation_participants cp2
        INNER JOIN users u2 ON u2.id = cp2.user_id
        WHERE cp2.conversation_id = m.conversation_id
          AND cp2.deleted_at IS NULL
          AND cp2.user_id <> ${userId}
          AND c.type::text = 'DM'
        LIMIT 1
      ) dm_peer ON TRUE
      WHERE m.deleted_at IS NULL
        AND m.conversation_id = ${conversationId}
        AND m.content IS NOT NULL
        AND length(trim(m.content)) > 0
        AND ${searchMatchCondition(needle)}
        ${cursorCondition(cursorCreatedAt, cursorId)}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${take}
    `)
    return rows
  },

  async searchGlobal(params: {
    userId: string
    needle: string
    limit: number
    cursorCreatedAt?: Date
    cursorId?: string
  }): Promise<MessageSearchRow[]> {
    const { userId, needle, limit, cursorCreatedAt, cursorId } = params
    const take = limit + 1

    const rows = await prisma.$queryRaw<MessageSearchRow[]>(Prisma.sql`
      SELECT
        m.id AS message_id,
        m.conversation_id,
        m.content,
        m.created_at,
        u.id AS sender_id,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        c.type::text AS conv_type,
        c.name AS group_name,
        dm_peer.display_name AS dm_peer_display_name
      FROM messages m
      INNER JOIN users u ON u.id = m.sender_id
      INNER JOIN conversations c ON c.id = m.conversation_id AND c.deleted_at IS NULL
      INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        AND cp.user_id = ${userId}
        AND cp.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT u2.display_name
        FROM conversation_participants cp2
        INNER JOIN users u2 ON u2.id = cp2.user_id
        WHERE cp2.conversation_id = m.conversation_id
          AND cp2.deleted_at IS NULL
          AND cp2.user_id <> ${userId}
          AND c.type::text = 'DM'
        LIMIT 1
      ) dm_peer ON TRUE
      WHERE m.deleted_at IS NULL
        AND m.content IS NOT NULL
        AND length(trim(m.content)) > 0
        AND ${searchMatchCondition(needle)}
        ${cursorCondition(cursorCreatedAt, cursorId)}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${take}
    `)
    return rows
  },
}
