import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, Search, User, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'
import { MessageSearchResultsDropdown } from './MessageSearchResultsDropdown'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'
import { cn } from '@/lib/utils'

type ChatThreadRoomSearchPanelProps = {
  open: boolean
  onClose: () => void
  conversationId: string
  onPickMessage: (messageId: string) => void
  className?: string
}

export function ChatThreadRoomSearchPanel({
  open,
  onClose,
  conversationId,
  onPickMessage,
  className,
}: ChatThreadRoomSearchPanelProps) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const search = useMessageSearch({
    mode: 'room',
    conversationId,
    rawQuery: q,
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setQ('')
      return
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  const trimmed = q.trim()
  const showResults = trimmed.length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH
  const showBigEmpty = trimmed.length === 0

  if (!open) return null

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col border-b border-border/60 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">Tìm kiếm trong trò chuyện</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={onClose}
          aria-label="Đóng tìm kiếm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pt-2">
        <div className="relative flex min-h-10 items-center gap-2 rounded-lg border border-border/80 bg-[#f4f5f7] px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nhập từ khóa để tìm kiếm"
            className="h-10 flex-1 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
            aria-label="Từ khóa tìm trong hội thoại"
          />
          {q ? (
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5"
              onClick={() => setQ('')}
              aria-label="Xóa từ khóa"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="h-9 flex-1 justify-between gap-1 border-dashed text-xs font-normal text-muted-foreground"
          title="Sắp có"
        >
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Người gửi
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="h-9 flex-1 justify-between gap-1 border-dashed text-xs font-normal text-muted-foreground"
          title="Sắp có"
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Ngày gửi
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {showBigEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/40">
              <Search className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.25} />
            </div>
            <p className="max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
              Hãy nhập từ khóa để bắt đầu tìm kiếm tin nhắn và file trong trò chuyện
            </p>
          </div>
        ) : null}

        {!showBigEmpty && !showResults && search.showHint ? (
          <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
            Nhập ít nhất {SEARCH_MESSAGES.MIN_QUERY_LENGTH} ký tự
          </p>
        ) : null}

        {showResults ? (
          <MessageSearchResultsDropdown
            variant="inline"
            query={search.debouncedQuery}
            items={search.items}
            isLoading={search.isLoading}
            isError={search.isError}
            showConversationLabel={false}
            onPick={(hit) => {
              setQ('')
              onClose()
              onPickMessage(hit.messageId)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
