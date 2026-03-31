import type { MessageSenderDto } from '@/features/messages/types/message.types'

export interface PinnedMessageItem {
  messageId: string
  pinnedAt: string
  pinnedBy: MessageSenderDto
  sender: MessageSenderDto
  preview: string
}
