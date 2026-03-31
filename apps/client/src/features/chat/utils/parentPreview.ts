import type { MessageItemDto, ParentMessagePreviewDto } from '@/features/messages/types/message.types'

function snippet(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function sortedAttachmentUrls(m: MessageItemDto): string[] {
  if (!m.attachments?.length) return []
  return [...m.attachments].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => a.url)
}

/** Dựng preview tin cha từ một message đầy đủ (fallback khi API chưa embed `parentPreview`). */
export function previewFromMessage(m: MessageItemDto): ParentMessagePreviewDto {
  const urls = sortedAttachmentUrls(m)
  const firstUrl = urls[0] ?? (m.fileUrl && m.fileType === 'IMAGE' ? m.fileUrl : null)
  const hasAttachments = Boolean(firstUrl)
  return {
    id: m.id,
    contentSnippet: m.content?.trim() ? snippet(m.content.trim(), 88) : null,
    hasAttachments,
    firstAttachmentUrl: firstUrl,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      displayName: m.sender.displayName,
      avatarUrl: m.sender.avatarUrl,
    },
    isDeleted: false,
  }
}

export function resolveParentPreview(
  m: MessageItemDto,
  allMessages: MessageItemDto[]
): ParentMessagePreviewDto | null {
  if (!m.parentMessageId) return null
  if (m.parentPreview) return m.parentPreview
  const parent = allMessages.find((x) => x.id === m.parentMessageId)
  if (!parent) return null
  return previewFromMessage(parent)
}
