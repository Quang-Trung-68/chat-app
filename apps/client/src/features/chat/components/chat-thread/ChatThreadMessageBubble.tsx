import { cn } from '@/lib/utils'
import type { MessageItemDto, ParentMessagePreviewDto } from '@/features/messages/types/message.types'
import { MessageImageGrid } from '../MessageImageGrid'
import { MessageQuote } from '../MessageQuote'
import { formatMessageTime } from '../../utils/format'
import { sortedAttachmentUrls } from './chatThreadMessageUtils'

type PendingEntry = { previewUrls?: string[] }

type ChatThreadMessageBubbleProps = {
  message: MessageItemDto
  variant: 'mine' | 'theirs'
  showSenderNameOnBubble: boolean
  senderLabel: string
  isGroupAdminMessage: boolean
  parentPreview: ParentMessagePreviewDto | null
  isDm: boolean
  pendingByMessageId: Record<string, PendingEntry>
  onNavigateParent?: () => void
  onOpenLightbox: (urls: string[], startIndex: number) => void
}

function MessageImageAttachments({
  message,
  pendingByMessageId,
  hasTextAbove,
  onOpenLightbox,
}: {
  message: MessageItemDto
  pendingByMessageId: Record<string, PendingEntry>
  hasTextAbove: boolean
  onOpenLightbox: (urls: string[], startIndex: number) => void
}) {
  const pending = pendingByMessageId[message.id]
  const serverUrls = sortedAttachmentUrls(message)
  const legacySingle =
    serverUrls.length === 0 && message.fileUrl && message.fileType === 'IMAGE' ? [message.fileUrl] : []
  const displayUrls =
    serverUrls.length > 0
      ? serverUrls
      : legacySingle.length > 0
        ? legacySingle
        : (pending?.previewUrls ?? [])
  const imageLoading =
    Boolean(pending?.previewUrls?.length) && serverUrls.length === 0 && legacySingle.length === 0
  if (displayUrls.length === 0 && !imageLoading) return null
  return (
    <div className={cn(hasTextAbove ? 'mt-2' : '')}>
      <MessageImageGrid
        urls={displayUrls}
        totalCount={displayUrls.length}
        loading={imageLoading}
        onPhotoClick={(idx) =>
          onOpenLightbox(displayUrls, Math.min(idx, displayUrls.length - 1))
        }
      />
    </div>
  )
}

export function ChatThreadMessageBubble({
  message,
  variant,
  showSenderNameOnBubble,
  senderLabel,
  isGroupAdminMessage,
  parentPreview,
  isDm,
  pendingByMessageId,
  onNavigateParent,
  onOpenLightbox,
}: ChatThreadMessageBubbleProps) {
  const mine = variant === 'mine'

  return (
    <div
      className={cn(
        'rounded-2xl px-3 py-2 text-[15px] shadow-sm',
        mine
          ? 'rounded-br-sm bg-primary text-primary-foreground'
          : 'rounded-bl-sm border-0 bg-secondary-surface text-foreground',
        isGroupAdminMessage && mine && 'ring-2 ring-amber-400/35',
        isGroupAdminMessage && !mine && 'ring-2 ring-amber-400/30'
      )}
    >
      {parentPreview ? (
        <div className={cn('mb-2', !mine && '-mx-0.5')}>
          <MessageQuote
            preview={parentPreview}
            mine={mine}
            hideSenderName={isDm}
            onNavigate={parentPreview.isDeleted ? undefined : onNavigateParent}
          />
        </div>
      ) : null}
      {showSenderNameOnBubble ? (
        <p className="mb-1 text-xs font-medium text-primary">{senderLabel}</p>
      ) : null}
      {message.content ? (
        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
      ) : null}
      <MessageImageAttachments
        message={message}
        pendingByMessageId={pendingByMessageId}
        hasTextAbove={Boolean(message.content)}
        onOpenLightbox={onOpenLightbox}
      />
      <div
        className={cn(
          'mt-1 text-[10px]',
          mine ? 'text-white/70' : 'text-muted-foreground/80'
        )}
      >
        <span>{formatMessageTime(message.createdAt)}</span>
      </div>
    </div>
  )
}
