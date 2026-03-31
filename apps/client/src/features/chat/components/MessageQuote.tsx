import type { ParentMessagePreviewDto } from '@/features/messages/types/message.types'
import { cn } from '@/lib/utils'

type MessageQuoteProps = {
  preview: ParentMessagePreviewDto
  mine: boolean
  onNavigate?: () => void
  className?: string
}

function senderLabel(p: ParentMessagePreviewDto): string {
  const d = p.sender.displayName?.trim()
  return d && d.length > 0 ? d : p.sender.username
}

export function MessageQuote({ preview, mine, onNavigate, className }: MessageQuoteProps) {
  const canNavigate = !preview.isDeleted && Boolean(onNavigate)
  const showThumb = Boolean(preview.firstAttachmentUrl) && !preview.isDeleted

  const inner = (
    <div
      className={cn(
        'flex min-w-0 gap-2 rounded-md border-l-[3px] px-2 py-1.5 text-left',
        mine
          ? 'border-white/40 bg-white/15'
          : 'border-[#0068ff]/40 bg-[#f0f4f8]'
      )}
    >
      {showThumb ? (
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
          <img
            src={preview.firstAttachmentUrl!}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate font-medium leading-tight',
            mine ? 'text-white font-semibold' : 'text-foreground'
          )}
        >
          {preview.isDeleted ? 'Tin nhắn đã bị xóa' : senderLabel(preview)}
        </p>
        {!preview.isDeleted ? (
          <p
            className={cn(
              'mt-0.5 line-clamp-2 wrap-break-word leading-snug',
              mine ? 'text-white/85' : 'text-muted-foreground'
            )}
          >
            {preview.contentSnippet ??
              (preview.hasAttachments ? 'Ảnh' : '…')}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (canNavigate) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={cn(
          'w-full rounded-md text-left transition-opacity hover:opacity-90 active:opacity-80',
          className
        )}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}
