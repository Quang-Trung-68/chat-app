import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import {
  ChatGlobalSearchToolbar,
  type SearchScopeTab,
} from './ChatGlobalSearchToolbar'
import { useMinuteTicker } from '@/hooks/useMinuteTicker'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { disbandGroup } from '@/features/rooms/api/rooms.api'
import { DisbandGroupConfirmDialog } from './DisbandGroupConfirmDialog'
import { ChatRoomListItem } from './ChatRoomListItem'

type ChatRoomListProps = {
  rooms: RoomListItem[] | undefined
  currentUserId: string | undefined
  className?: string
}

export function ChatRoomList({ rooms, currentUserId, className }: ChatRoomListProps) {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [disbandRoom, setDisbandRoom] = useState<RoomListItem | null>(null)

  const disbandMut = useMutation({
    mutationFn: (id: string) => disbandGroup(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: roomsKeys.all })
      setDisbandRoom(null)
      if (conversationId === id) navigate('/chat')
    },
  })

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

  const closeSearchUi = () => {
    setQ('')
    setSearchFocused(false)
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full shrink-0 flex-col border-r border-border/80 bg-white lg:max-w-[300px]',
        className
      )}
    >
      <DisbandGroupConfirmDialog
        open={disbandRoom !== null}
        onOpenChange={(o) => {
          if (!o) setDisbandRoom(null)
        }}
        onConfirm={() => {
          if (disbandRoom) disbandMut.mutate(disbandRoom.id)
        }}
        isPending={disbandMut.isPending}
      />
      <ChatGlobalSearchToolbar
        q={q}
        onQChange={setQ}
        searchFocused={searchFocused}
        onSearchFocusChange={setSearchFocused}
        searchScopeTab={searchScopeTab}
        onSearchScopeTabChange={setSearchScopeTab}
        messageSearch={messageSearch}
        onCloseSearchUi={closeSearchUi}
      />

      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={cn(
              'relative py-2.5 text-[14px] font-medium transition-colors',
              tab === 'all'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Tất cả
            {tab === 'all' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('unread')}
            className={cn(
              'relative py-2.5 text-[14px] font-medium transition-colors',
              tab === 'unread'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Chưa đọc
            {tab === 'unread' ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Phân loại
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/5 text-muted-foreground hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rooms === undefined ? (
          <ul className="py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Không có hội thoại</p>
        ) : (
          <ul className="py-1">
            {filtered.map((room) => (
              <ChatRoomListItem
                key={room.id}
                room={room}
                currentUserId={currentUserId}
                isActive={conversationId === room.id}
                disbandPending={Boolean(disbandMut.isPending && disbandRoom?.id === room.id)}
                onRequestDisband={() => setDisbandRoom(room)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
