import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  ChevronRight,
  EyeOff,
  Flag,
  FolderInput,
  Mail,
  MessageSquareDot,
  MoreHorizontal,
  Pin,
  Trash2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { formatSidebarTime } from '../utils/format'
import {
  ChatGlobalSearchToolbar,
  type SearchScopeTab,
} from './ChatGlobalSearchToolbar'
import { useMinuteTicker } from '@/hooks/useMinuteTicker'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import { useMessageSearch } from '@/features/messages/hooks/useMessageSearch'
import { SEARCH_MESSAGES } from '@chat-app/shared-constants'
import { useRoomSidebarHintsStore } from '@/features/rooms/store/roomSidebarHints.store'
import { roomsKeys } from '@/features/rooms/rooms.keys'
import { disbandGroup } from '@/features/rooms/api/rooms.api'
import { DisbandGroupConfirmDialog } from './DisbandGroupConfirmDialog'
import { OnlinePresenceDot } from './OnlinePresenceDot'

type ChatRoomListProps = {
  rooms: RoomListItem[] | undefined
  currentUserId: string | undefined
  className?: string
}

function RoomRowMoreMenu({
  room,
  currentUserId,
  onRequestDisband,
  disbandPending,
}: {
  room: RoomListItem
  currentUserId: string | undefined
  onRequestDisband?: () => void
  disbandPending?: boolean
}) {
  const isGroupOwner =
    room.type === 'GROUP' &&
    Boolean(currentUserId && room.participants.some((p) => p.id === currentUserId && p.role === 'OWNER'))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Thêm"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="min-w-56"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
          <Pin className="h-4 w-4" />
          Ghim hội thoại
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="justify-between opacity-80"
          onSelect={(e) => e.preventDefault()}
        >
          <span className="flex items-center gap-2">
            <FolderInput className="h-4 w-4" />
            Phân loại
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </DropdownMenuItem>
        <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
          <Mail className="h-4 w-4" />
          Đánh dấu chưa đọc
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
          <Bell className="h-4 w-4" />
          Bật thông báo
        </DropdownMenuItem>
        <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
          <EyeOff className="h-4 w-4" />
          Ẩn trò chuyện
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="justify-between text-muted-foreground opacity-70"
          onSelect={(e) => e.preventDefault()}
        >
          <span className="flex items-center gap-2">
            <MessageSquareDot className="h-4 w-4" />
            Tin nhắn tự xóa
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
          <Trash2 className="h-4 w-4" />
          Xóa hội thoại
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
          <Flag className="h-4 w-4" />
          Báo xấu
        </DropdownMenuItem>
        {isGroupOwner ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              disabled={disbandPending}
              onSelect={() => onRequestDisband?.()}
            >
              <Trash2 className="h-4 w-4" />
              Giải tán nhóm
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
  const sidebarHints = useRoomSidebarHintsStore((s) => s.hints)
  const typingByConversation = useTypingPresenceStore((s) => s.typingByConversation)
  const presenceOnline = useTypingPresenceStore((s) => s.presenceOnline)
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
              const sidebarHint = sidebarHints[room.id]
              const previewPrimary = typingLine ?? (sidebarHint ?? previewPlain)
              const isSidebarHint = Boolean(sidebarHint && !typingLine)
              const time = last ? formatSidebarTime(last.createdAt) : ''
              const unreadHighlight = room.unreadCount > 0 && !active
              const initial = title.slice(0, 1).toUpperCase()
              const other = room.participants.find((p) => p.id !== currentUserId)
              const av = room.type === 'GROUP' ? null : other?.avatarUrl
              const peerOnline =
                room.type === 'DM' && other ? Boolean(presenceOnline[other.id]) : false

              return (
                <li
                  key={room.id}
                  className={cn(
                    'group flex items-stretch transition-colors',
                    active ? 'bg-[#e5f0ff]' : 'hover:bg-[#f0f4ff]'
                  )}
                >
                  <Link
                    to={`/chat/${room.id}`}
                    className="flex min-w-0 flex-1 gap-2.5 px-3 py-2"
                  >
                    <div className="relative h-11 w-11 shrink-0">
                      <Avatar className="h-11 w-11">
                        {av ? <AvatarImage src={av} alt="" /> : null}
                        <AvatarFallback className="bg-[#0068ff]/15 text-sm font-medium text-[#0068ff]">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <OnlinePresenceDot show={peerOnline} />
                    </div>
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
                            isSidebarHint && 'text-[11px] font-medium leading-snug text-red-600',
                            !isSidebarHint && unreadHighlight && 'font-semibold text-foreground',
                            !isSidebarHint && !unreadHighlight && 'text-muted-foreground',
                            !isSidebarHint && typingLine && 'italic text-[#0068ff]'
                          )}
                        >
                          {previewPrimary}
                        </p>
                        {room.unreadCount > 0 && !active ? (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                  <div
                    className={cn(
                      'flex shrink-0 items-center self-center pr-2',
                      'opacity-0 transition-opacity group-hover:opacity-100',
                      active && 'opacity-100'
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <RoomRowMoreMenu
                      room={room}
                      currentUserId={currentUserId}
                      disbandPending={Boolean(disbandMut.isPending && disbandRoom?.id === room.id)}
                      onRequestDisband={() => setDisbandRoom(room)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
