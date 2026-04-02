import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { formatSidebarTime } from '../utils/format'
import { userDisplayName } from '@/lib/userDisplay'
import { useTypingPresenceStore } from '@/features/sockets/typingPresence.store'
import { useRoomSidebarHintsStore } from '@/features/rooms/store/roomSidebarHints.store'
import { OnlinePresenceDot } from './OnlinePresenceDot'
import { RoomRowMoreMenu } from './RoomRowMoreMenu'
import { EMPTY_STRING_ARRAY } from '@/lib/zustandEmpty'

type ChatRoomListItemProps = {
  room: RoomListItem
  currentUserId: string | undefined
  isActive: boolean
  disbandPending: boolean
  onRequestDisband: () => void
}

export function ChatRoomListItem({
  room,
  currentUserId,
  isActive,
  disbandPending,
  onRequestDisband,
}: ChatRoomListItemProps) {
  const typingByConversation = useTypingPresenceStore((s) => s.typingByConversation)
  const presenceOnline = useTypingPresenceStore((s) => s.presenceOnline)
  const sidebarHints = useRoomSidebarHintsStore((s) => s.hints)

  const title = getRoomTitle(room, currentUserId)
  const last = room.lastMessage
  const previewBase = last?.content?.slice(0, 80) ?? (last ? 'Tin nhắn' : 'Chưa có tin')
  const sender = last ? room.participants.find((p) => p.id === last.senderId) : undefined

  const typingIds = (typingByConversation[room.id] ?? EMPTY_STRING_ARRAY).filter(
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
  const unreadHighlight = room.unreadCount > 0 && !isActive
  const initial = title.slice(0, 1).toUpperCase()
  const other = room.participants.find((p) => p.id !== currentUserId)
  const av = room.type === 'GROUP' ? null : other?.avatarUrl
  const peerOnline = room.type === 'DM' && other ? Boolean(presenceOnline[other.id]) : false

  return (
    <li
      className={cn(
        'group relative flex items-stretch transition-colors',
        isActive ? 'bg-primary/10' : 'hover:bg-primary/5'
      )}
    >
      <Link
        to={`/chat/${room.id}`}
        className="flex min-w-0 flex-1 gap-2.5 px-3 py-2"
      >
        <div className="relative h-11 w-11 shrink-0">
          <Avatar className="h-11 w-11">
            {av ? <AvatarImage src={av} alt="" /> : null}
            <AvatarFallback className="bg-primary/15 text-sm font-medium text-primary">
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
            <div
              className="relative shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {time ? (
                <span
                  className={cn(
                    'block pt-0.5 text-[10px] text-muted-foreground',
                    'transition-opacity duration-150',
                    'group-hover:opacity-0 group-has-[[data-state=open]]:opacity-0'
                  )}
                >
                  {time}
                </span>
              ) : null}
              <span
                className={cn(
                  'absolute right-0 top-0',
                  'opacity-0 transition-opacity duration-150',
                  'group-hover:opacity-100 group-has-[[data-state=open]]:opacity-100'
                )}
              >
                <RoomRowMoreMenu
                  room={room}
                  currentUserId={currentUserId}
                  disbandPending={disbandPending}
                  onRequestDisband={onRequestDisband}
                />
              </span>
            </div>
          </div>
          <div className="mt-0.5 flex items-end justify-between gap-2">
            <p
              className={cn(
                'min-w-0 flex-1 truncate text-xs',
                isSidebarHint && 'text-[11px] font-medium leading-snug text-red-600',
                !isSidebarHint && unreadHighlight && 'font-semibold text-foreground',
                !isSidebarHint && !unreadHighlight && 'text-muted-foreground',
                !isSidebarHint && typingLine && 'italic text-primary'
              )}
            >
              {previewPrimary}
            </p>
            {room.unreadCount > 0 && !isActive ? (
              <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
