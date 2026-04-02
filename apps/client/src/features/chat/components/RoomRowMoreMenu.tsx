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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RoomListItem } from '@/features/rooms/types/room.types'

type RoomRowMoreMenuProps = {
  room: RoomListItem
  currentUserId: string | undefined
  onRequestDisband?: () => void
  disbandPending?: boolean
}

export function RoomRowMoreMenu({
  room,
  currentUserId,
  onRequestDisband,
  disbandPending,
}: RoomRowMoreMenuProps) {
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
