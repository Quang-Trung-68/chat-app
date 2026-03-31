import { Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { highlightSearchSnippet } from '@/lib/searchHighlight'
import type { MessageSearchHitDto } from '@/features/messages/api/messageSearch.api'
import { formatSearchHitTime } from '../utils/format'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'

type MessageSearchResultsDropdownProps = {
  /** `dropdown`: absolute dưới ô tìm; `inline`: trong panel (tìm theo room). */
  variant?: 'dropdown' | 'inline'
  query: string
  items: MessageSearchHitDto[]
  isLoading: boolean
  isError: boolean
  /** Global: hàng 1 là tên hội thoại; room: hàng 1 là người gửi. */
  showConversationLabel: boolean
  onPick: (hit: MessageSearchHitDto) => void
  className?: string
}

export function MessageSearchResultsDropdown({
  variant = 'dropdown',
  query,
  items,
  isLoading,
  isError,
  showConversationLabel,
  onPick,
  className,
}: MessageSearchResultsDropdownProps) {
  return (
    <div
      className={cn(
        variant === 'dropdown'
          ? 'absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-border/80 bg-white py-1 shadow-lg'
          : 'max-h-[min(50vh,320px)] w-full overflow-y-auto border-t border-border/60 bg-white py-1',
        className
      )}
      onMouseDown={(e) => e.preventDefault()}
      role="listbox"
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tìm…
        </div>
      ) : isError ? (
        <p className="px-3 py-6 text-center text-sm text-destructive">Không tải được kết quả.</p>
      ) : items.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">Không có tin nhắn phù hợp.</p>
      ) : (
        <ul className="py-0.5">
          <li className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tin nhắn{items.length >= SEARCH_MESSAGES.DEFAULT_LIMIT ? ' (nhiều)' : ` (${items.length})`}
          </li>
          {items.map((hit) => {
            const senderInitial = hit.sender.displayName.slice(0, 1).toUpperCase()
            const senderLabel = hit.isSentByViewer ? 'Bạn' : hit.sender.displayName
            const titleRow = showConversationLabel ? hit.conversationLabel : senderLabel
            return (
              <li key={`${hit.conversationId}-${hit.messageId}`}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full gap-2 px-3 py-2 text-left transition-colors hover:bg-[#f0f4ff]"
                  onClick={() => onPick(hit)}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {hit.sender.avatarUrl ? <AvatarImage src={hit.sender.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-[#0068ff]/15 text-xs font-medium text-[#0068ff]">
                      {senderInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{titleRow}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatSearchHitTime(hit.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {showConversationLabel ? (
                        <>
                          <span className="font-medium text-foreground">{senderLabel}: </span>
                          {highlightSearchSnippet(hit.snippet, query)}
                        </>
                      ) : (
                        highlightSearchSnippet(hit.snippet, query)
                      )}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
