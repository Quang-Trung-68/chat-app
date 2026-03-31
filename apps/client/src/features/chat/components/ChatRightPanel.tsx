import { useState, type ReactNode } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link2,
  PanelRightClose,
  Pin,
  UserPlus,
  Users,
} from 'lucide-react'
import { MAX_PINS_PER_CONVERSATION } from '@chat-app/shared-constants'
import { ChatThreadRoomSearchPanel } from './ChatThreadRoomSearchPanel'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRoomPinsQuery } from '@/features/rooms/queries/useRoomPins'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import { getRoomTitle } from '../utils/roomTitle'
import { cn } from '@/lib/utils'
import { userDisplayName } from '@/lib/userDisplay'

type ChatRightPanelProps = {
  room: RoomListItem
  currentUserId: string | undefined
  onClose: () => void
  /** Cuộn tới tin trong thread (đăng ký từ ChatThread). */
  onPinnedMessageClick?: (messageId: string) => void
  /** Hiển thị khối tìm kiếm trong hội thoại (toggle từ icon header ChatThread). */
  roomSearchOpen: boolean
  onCloseRoomSearch: () => void
  onRoomSearchPickMessage?: (messageId: string) => void
}

function CollapsibleHeader({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/30"
    >
      {children}
      {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  )
}

export function ChatRightPanel({
  room,
  currentUserId,
  onClose,
  onPinnedMessageClick,
  roomSearchOpen,
  onCloseRoomSearch,
  onRoomSearchPickMessage,
}: ChatRightPanelProps) {
  const title = getRoomTitle(room, currentUserId)
  const initial = title.slice(0, 1).toUpperCase()
  const { data: pins = [] } = useRoomPinsQuery(room.id)
  const [pinsOpen, setPinsOpen] = useState(true)
  const [membersOpen, setMembersOpen] = useState(true)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)

  return (
    <div className="flex h-full w-full max-w-[320px] shrink-0 flex-col border-l border-border/80 bg-white">
      {
        roomSearchOpen ? null : (
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              Thông tin hội thoại
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Đóng panel">
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>
        )
      }

      <ChatThreadRoomSearchPanel
        open={roomSearchOpen}
        onClose={onCloseRoomSearch}
        conversationId={room.id}
        onPickMessage={(messageId) => onRoomSearchPickMessage?.(messageId)}
        className={cn(
          'shadow-none',
          roomSearchOpen ? 'min-h-0 flex-1 border-b-0' : 'max-h-[min(45vh,400px)] shrink-0'
        )}
      />

      {!roomSearchOpen ? (
        <>
          <div className="shrink-0 border-b border-border/40 px-4 pb-4 pt-5 text-center">
            <Avatar className="mx-auto h-16 w-16">
              <AvatarFallback className="text-lg font-medium">{initial}</AvatarFallback>
            </Avatar>
            <h2 className="mt-2 text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {room.type === 'GROUP' ? `${room.participants.length} thành viên` : 'Hội thoại 1–1'}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-border/40 px-2 py-3">
            <Button
              type="button"
              variant="ghost"
              disabled
              className="flex h-auto flex-col gap-1 py-2 text-[10px] font-normal text-muted-foreground hover:bg-muted/50"
            >
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              <span className="leading-tight">Tắt TB</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled
              className="flex h-auto flex-col gap-1 py-2 text-[10px] font-normal text-muted-foreground hover:bg-muted/50"
            >
              <Pin className="h-5 w-5" strokeWidth={1.75} />
              <span className="leading-tight">Ghim HT</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled
              className="flex h-auto flex-col gap-1 py-2 text-[10px] font-normal text-muted-foreground hover:bg-muted/50"
            >
              <UserPlus className="h-5 w-5" strokeWidth={1.75} />
              <span className="leading-tight">Thêm TV</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled
              className="flex h-auto flex-col gap-1 py-2 text-[10px] font-normal text-muted-foreground hover:bg-muted/50"
            >
              <Users className="h-5 w-5" strokeWidth={1.75} />
              <span className="leading-tight">Nhóm</span>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={pinsOpen} onToggle={() => setPinsOpen((o) => !o)}>
                <span className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-amber-600" aria-hidden />
                  Tin đã ghim
                  <span className="text-xs font-normal text-muted-foreground">
                    ({pins.length}/{MAX_PINS_PER_CONVERSATION})
                  </span>
                </span>
              </CollapsibleHeader>
              {pinsOpen ? (
                pins.length === 0 ? (
                  <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có tin ghim. Ghim từ menu trên từng tin.</p>
                ) : (
                  <ul className="space-y-1.5 pb-3">
                    {pins.map((p) => (
                      <li key={p.messageId}>
                        <button
                          type="button"
                          onClick={() => onPinnedMessageClick?.(p.messageId)}
                          className={cn(
                            'w-full rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-left text-xs transition-colors',
                            onPinnedMessageClick && 'hover:bg-accent'
                          )}
                          disabled={!onPinnedMessageClick}
                        >
                          <span className="line-clamp-2 text-foreground">{p.preview}</span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {p.sender.displayName?.trim() || p.sender.username}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={mediaOpen} onToggle={() => setMediaOpen((o) => !o)}>
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Ảnh / video
                </span>
              </CollapsibleHeader>
              {mediaOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có ảnh hoặc video trong hội thoại.</p>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={filesOpen} onToggle={() => setFilesOpen((o) => !o)}>
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  File
                </span>
              </CollapsibleHeader>
              {filesOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có file được chia sẻ.</p>
              ) : null}
            </div>

            <div className="border-b border-border/40 py-1">
              <CollapsibleHeader open={linksOpen} onToggle={() => setLinksOpen((o) => !o)}>
                <span className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Link
                </span>
              </CollapsibleHeader>
              {linksOpen ? (
                <p className="pb-3 pl-1 text-xs text-muted-foreground">Chưa có liên kết trong hội thoại.</p>
              ) : null}
            </div>

            <div className="py-1">
              <CollapsibleHeader open={membersOpen} onToggle={() => setMembersOpen((o) => !o)}>
                <span>Thành viên ({room.participants.length})</span>
              </CollapsibleHeader>
              {membersOpen ? (
                <ul className="space-y-2 pb-3 pt-1">
                  {room.participants.map((p) => {
                    const label = userDisplayName(p)
                    return (
                      <li key={p.id} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs">{label.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{label}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
