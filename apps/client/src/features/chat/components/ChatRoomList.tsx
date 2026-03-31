import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, UserPlus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { formatSidebarTime } from '../utils/format'
import { CreateGroupDialog } from './CreateGroupDialog'
import { useMinuteTicker } from '@/hooks/useMinuteTicker'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'
import { MessageSearchResultsDropdown } from './MessageSearchResultsDropdown'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'

type ChatRoomListProps = {
  rooms: RoomListItem[] | undefined
  currentUserId: string | undefined
}

type SearchScopeTab = 'all' | 'contacts' | 'messages' | 'files'

export function ChatRoomList({ rooms, currentUserId }: ChatRoomListProps) {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  useMinuteTicker()
  const typingByConversation = useTypingPresenceStore((s) => s.typingByConversation)
  const [q, setQ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchScopeTab, setSearchScopeTab] = useState<SearchScopeTab>('all')
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const scopeAllowsMessageSearch = searchScopeTab === 'all' || searchScopeTab === 'messages'

  const messageSearch = useMessageSearch({
    mode: 'global',
    conversationId: undefined,
    rawQuery: q,
    enabled: searchFocused && scopeAllowsMessageSearch,
  })

  const showSearchDropdown =
    searchFocused &&
    scopeAllowsMessageSearch &&
    q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH

  const filtered = useMemo(() => {
    let list = rooms ?? []
    if (tab === 'unread') list = list.filter((r) => r.unreadCount > 0)
    if (q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH) return list
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((r) => {
        const title = getRoomTitle(r, currentUserId).toLowerCase()
        const prev = r.lastMessage?.content?.toLowerCase() ?? ''
        const typingIds = (typingByConversation[r.id] ?? []).filter((id) => id !== currentUserId)
        const typingLabels = typingIds
          .map((id) => {
            const p = r.participants.find((x) => x.id === id)
            return p ? userDisplayName(p) : ''
          })
          .filter(Boolean)
        const typingSearch =
          typingLabels.length === 0
            ? ''
            : typingLabels.length === 1
              ? `${typingLabels[0]} đang nhập…`.toLowerCase()
              : `${typingLabels.join(', ')} đang nhập…`.toLowerCase()
        return title.includes(n) || prev.includes(n) || typingSearch.includes(n)
      })
    }
    return list
  }, [rooms, tab, q, currentUserId, typingByConversation])

  const searchTabs: { id: SearchScopeTab; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'contacts', label: 'Liên hệ' },
    { id: 'messages', label: 'Tin nhắn' },
    { id: 'files', label: 'File' },
  ]

  const closeSearchUi = () => {
    setQ('')
    setSearchFocused(false)
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-[300px] shrink-0 flex-col border-r border-border/80 bg-white">
      <div className="relative z-30 shrink-0 border-b border-border/60">
        <div className="flex items-center gap-1.5 p-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 180)}
              placeholder="Tìm kiếm"
              className="h-9 rounded-full border-border/80 bg-[#f4f5f7] pl-9 pr-9 text-sm shadow-none"
              aria-label="Tìm kiếm toàn cục"
            />
            {q ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQ('')}
                aria-label="Xóa ô tìm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 px-2 text-xs text-muted-foreground hover:bg-[#e5f0ff] hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onClick={closeSearchUi}
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-[#e5f0ff] hover:text-foreground"
            disabled
            title="Thêm bạn (sắp có)"
            aria-label="Thêm bạn (sắp có)"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
          <CreateGroupDialog />
        </div>

        <div className="flex border-b border-border/50 px-1">
          {searchTabs.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSearchScopeTab(st.id)}
              className={cn(
                'relative flex-1 py-2 text-center text-xs font-medium transition-colors sm:text-sm',
                searchScopeTab === st.id
                  ? 'text-[#0068ff]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {st.label}
              {searchScopeTab === st.id ? (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0068ff]" />
              ) : null}
            </button>
          ))}
        </div>

        {showSearchDropdown ? (
          <MessageSearchResultsDropdown
            query={messageSearch.debouncedQuery}
            items={messageSearch.items}
            isLoading={messageSearch.isLoading}
            isError={messageSearch.isError}
            showConversationLabel
            onPick={(hit) => {
              closeSearchUi()
              navigate(`/chat/${hit.conversationId}`, {
                state: { focusMessageId: hit.messageId },
              })
            }}
            className="shadow-md"
          />
        ) : null}

        {searchFocused && messageSearch.showHint && scopeAllowsMessageSearch ? (
          <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
            Nhập ít nhất {SEARCH_MESSAGES.MIN_QUERY_LENGTH} ký tự
          </p>
        ) : null}

        {searchFocused &&
        q.trim().length >= SEARCH_MESSAGES.MIN_QUERY_LENGTH &&
        !scopeAllowsMessageSearch ? (
          <p className="px-3 py-3 text-center text-xs text-muted-foreground">
            Tìm theo Liên hệ / File — sắp có
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 border-b border-border/60 px-2">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={cn(
            'relative flex-1 py-2.5 text-sm font-medium transition-colors',
            tab === 'all'
              ? 'text-[#0068ff]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Tất cả
          {tab === 'all' ? (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0068ff]" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={cn(
            'relative flex-1 py-2.5 text-sm font-medium transition-colors',
            tab === 'unread'
              ? 'text-[#0068ff]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Chưa đọc
          {tab === 'unread' ? (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0068ff]" />
          ) : null}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Không có hội thoại</p>
        ) : (
          <ul className="py-1">
            {filtered.map((room) => {
              const title = getRoomTitle(room, currentUserId)
              const active = conversationId === room.id
              const last = room.lastMessage
              const previewBase = last?.content?.slice(0, 80) ?? (last ? 'Tin nhắn' : 'Chưa có tin')
              const sender = last
                ? room.participants.find((p) => p.id === last.senderId)
                : undefined
              const typingIds = (typingByConversation[room.id] ?? []).filter(
                (id) => id !== currentUserId
              )
              const typingLabels = typingIds.map((id) => {
                const p = room.participants.find((x) => x.id === id)
                return p ? userDisplayName(p) : '…'
              })
              const typingLine =
                typingLabels.length === 0
                  ? null
                  : typingLabels.length === 1
                    ? `${typingLabels[0]} đang nhập…`
                    : `${typingLabels.join(', ')} đang nhập…`

              const previewPlain =
                room.type === 'GROUP' && last && sender
                  ? `${userDisplayName(sender)}: ${previewBase}`
                  : previewBase
              const preview = typingLine ?? previewPlain
              const time = last ? formatSidebarTime(last.createdAt) : ''
              const unreadHighlight = room.unreadCount > 0 && !active
              const initial = title.slice(0, 1).toUpperCase()
              const other = room.participants.find((p) => p.id !== currentUserId)
              const av = room.type === 'GROUP' ? null : other?.avatarUrl

              return (
                <li key={room.id}>
                  <Link
                    to={`/chat/${room.id}`}
                    className={cn(
                      'flex gap-2.5 px-3 py-2 transition-colors',
                      active
                        ? 'bg-[#e5f0ff]'
                        : 'hover:bg-[#f0f4ff]'
                    )}
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      {av ? <AvatarImage src={av} alt="" /> : null}
                      <AvatarFallback className="bg-[#0068ff]/15 text-sm font-medium text-[#0068ff]">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-sm text-foreground',
                            unreadHighlight ? 'font-bold' : 'font-semibold'
                          )}
                        >
                          {title}
                        </span>
                        {time ? (
                          <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                            {time}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-end justify-between gap-2">
                        <p
                          className={cn(
                            'min-w-0 flex-1 truncate text-xs',
                            unreadHighlight ? 'font-semibold text-foreground' : 'text-muted-foreground',
                            typingLine && 'italic text-[#0068ff]'
                          )}
                        >
                          {preview}
                        </p>
                        {room.unreadCount > 0 ? (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
