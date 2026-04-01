import type { MessageItemDto } from '@/features/messages/types/message.types'

/** URL ảnh theo thứ tự hiển thị (đa ảnh + legacy một ảnh). */
export function imageUrlsForMessage(m: MessageItemDto): string[] {
  if (m.attachments?.length) {
    return [...m.attachments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => a.url)
  }
  if (m.fileUrl && m.fileType === 'IMAGE') return [m.fileUrl]
  return []
}

export function suggestedImageFilename(url: string, index: number): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').pop() ?? ''
    if (last && /\.(jpe?g|png|gif|webp)$/i.test(last)) return last
  } catch {
    /* ignore */
  }
  return `anh-${index + 1}.jpg`
}

export async function downloadImageUrl(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
