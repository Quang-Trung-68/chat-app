import type { MessageItemDto } from '@/features/messages/types/message.types'

export function groupMessagesByDay(messages: MessageItemDto[]) {
  const groups: { dayKey: string; items: MessageItemDto[] }[] = []
  for (const m of messages) {
    const d = new Date(m.createdAt)
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const last = groups[groups.length - 1]
    if (!last || last.dayKey !== dayKey) {
      groups.push({ dayKey, items: [m] })
    } else {
      last.items.push(m)
    }
  }
  return groups
}

export function sortedAttachmentUrls(m: MessageItemDto): string[] {
  if (!m.attachments?.length) return []
  return [...m.attachments].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => a.url)
}

export function imageCountForMessage(m: MessageItemDto): number {
  const urls = sortedAttachmentUrls(m)
  if (urls.length > 0) return urls.length
  if (m.fileUrl && m.fileType === 'IMAGE') return 1
  return 0
}
