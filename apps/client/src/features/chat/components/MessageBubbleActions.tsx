import { useCallback } from 'react'
import { MAX_PINS_PER_CONVERSATION } from '@chat-app/shared-constants'
import {
  ChevronRight,
  Copy,
  Forward,
  Info,
  List,
  MessageSquareQuote,
  MoreHorizontal,
  Pin,
  Star,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { cn } from '@/lib/utils'

type MessageBubbleActionsProps = {
  message: MessageItemDto
  conversationId: string
  mine: boolean
  isPinned: boolean
  pinSlotsLeft: boolean
  pinPending: boolean
  unpinPending: boolean
  onReply: () => void
  onPin: () => void
  onUnpin: () => void
}

function iconCircle(mine: boolean) {
  return cn(
    'h-7 w-7 min-h-7 min-w-7 shrink-0 rounded-full border shadow-sm transition-colors',
    '[&_svg]:h-3.5 [&_svg]:w-3.5',
    mine
      ? [
          'border-zinc-200/70 bg-white/95 text-slate-700',
          'hover:border-slate-300 hover:bg-white hover:text-slate-900',
        ]
      : [
          'border-zinc-200 bg-white/95 text-slate-600',
          'hover:bg-slate-50 hover:text-slate-900',
        ]
  )
}

export function MessageBubbleActions({
  message,
  mine,
  isPinned,
  pinSlotsLeft,
  pinPending,
  unpinPending,
  onReply,
  onPin,
  onUnpin,
}: MessageBubbleActionsProps) {
  const copyText = useCallback(async () => {
    const t = message.content?.trim()
    const fallback = message.attachments?.length || message.fileUrl ? '(tin có ảnh/tệp)' : ''
    try {
      await navigator.clipboard.writeText(t || fallback || '')
    } catch {
      /* ignore */
    }
  }, [message.attachments?.length, message.content, message.fileUrl])

  return (
    <div
      className={cn(
        'flex min-w-0 shrink-0 items-center gap-0.5',
        'opacity-0 pointer-events-none transition-opacity duration-150',
        'group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconCircle(mine)}
        aria-label="Trả lời"
        title="Trả lời"
        onClick={onReply}
      >
        <MessageSquareQuote strokeWidth={2} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconCircle(mine)}
        disabled
        aria-label="Chuyển tiếp"
        title="Sắp có"
      >
        <Forward strokeWidth={2} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconCircle(mine)}
            aria-label="Thêm"
          >
            <MoreHorizontal strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={mine ? 'end' : 'start'} className="min-w-56">
          <DropdownMenuItem onClick={() => void copyText()}>
            <Copy className="h-4 w-4" />
            Copy tin nhắn
          </DropdownMenuItem>
          {isPinned ? (
            <DropdownMenuItem disabled={unpinPending} onClick={() => onUnpin()}>
              <Pin className="h-4 w-4" />
              Bỏ ghim tin nhắn
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={pinPending || !pinSlotsLeft}
              onClick={() => onPin()}
              title={!pinSlotsLeft ? `Tối đa ${MAX_PINS_PER_CONVERSATION} tin ghim` : undefined}
            >
              <Pin className="h-4 w-4" />
              Ghim tin nhắn
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Star className="h-4 w-4" />
            Đánh dấu tin nhắn
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <List className="h-4 w-4" />
            Chọn nhiều tin nhắn
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Info className="h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="justify-between opacity-60">
            <span className="flex items-center gap-2">
              <span className="w-4" />
              Tuỳ chọn khác
            </span>
            <ChevronRight className="h-4 w-4" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            Xóa chỉ ở phía tôi
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
