import { Link } from 'react-router-dom'
import { Users, Ghost } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getRoomTitle } from '@/features/chat/utils/roomTitle'
import type { RoomListItem } from '@/features/rooms/types/room.types'

export function ContactsGroupsPage() {
  const { user } = useAuth()
  const { data: rooms, isLoading, isError } = useRoomsQuery()
  const groups = (rooms ?? []).filter((r) => r.type === 'GROUP')

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
        <Users className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="text-base font-semibold">Danh sách nhóm và cộng đồng</h1>
      </header>
      <div className="border-b border-border/50 bg-white px-4 py-2">
        <p className="text-sm text-muted-foreground">Nhóm ({groups.length})</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3">
          {isLoading ? (
            <ul className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-white px-2 py-2.5 shadow-sm ring-1 ring-border/40">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-1/3" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-destructive">Đã xảy ra lỗi</p>
              <p className="text-xs text-muted-foreground">Không tải được danh sách nhóm.</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Ghost className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Trống</p>
              <p className="mt-1 text-xs text-muted-foreground">Bạn chưa tham gia nhóm nào.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {groups.map((room) => (
                <GroupRow key={room.id} room={room} currentUserId={user?.id} />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function GroupRow({
  room,
  currentUserId,
}: {
  room: RoomListItem
  currentUserId: string | undefined
}) {
  const title = getRoomTitle(room, currentUserId)
  const initial = title.slice(0, 1).toUpperCase()
  return (
    <li>
      <Link
        to={`/chat/${room.id}`}
        className="flex items-center gap-3 rounded-lg bg-white px-2 py-2.5 shadow-sm ring-1 ring-border/40 transition-colors hover:bg-primary/5"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-xs font-medium text-primary">{initial}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-semibold">{title}</span>
      </Link>
    </li>
  )
}
