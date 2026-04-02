import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchX, Ghost } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { userDisplayName } from '@/lib/userDisplay'
import { useFriendsAcceptedQuery } from '@/features/friends/hooks/useFriendsAcceptedQuery'
import { deleteFriendship, type AcceptedFriendItem } from '@/features/friends/api/friends.api'
import { invalidateFriendQueries } from '@/features/friends/invalidateFriendQueries'
import { groupFriendsByLetter } from '@/features/contacts/utils/groupByLetter'

export function ContactsFriendsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useFriendsAcceptedQuery()
  const [filter, setFilter] = useState('')
  const [infoFriend, setInfoFriend] = useState<AcceptedFriendItem | null>(null)
  const [aliasFriend, setAliasFriend] = useState<AcceptedFriendItem | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AcceptedFriendItem | null>(null)

  const filtered = useMemo(() => {
    const items = data?.items ?? []
    const q = filter.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => {
      const name = userDisplayName(row.user).toLowerCase()
      const un = row.user.username.toLowerCase()
      return name.includes(q) || un.includes(q)
    })
  }, [data?.items, filter])

  const grouped = useMemo(() => groupFriendsByLetter(filtered), [filtered])

  const removeMut = useMutation({
    mutationFn: (friendshipId: string) => deleteFriendship(friendshipId),
    onSuccess: () => {
      invalidateFriendQueries(queryClient)
      setDeleteTarget(null)
    },
  })

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
        <Users className="h-5 w-5 text-[#0068ff]" aria-hidden />
        <h1 className="text-base font-semibold">Danh sách bạn bè</h1>
      </header>

      <div className="border-b border-border/50 bg-white px-4 py-2">
        <p className="text-sm text-muted-foreground">
          Bạn bè ({data?.total ?? 0})
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Tìm bạn"
              className="h-9 pl-8"
              aria-label="Lọc danh sách bạn bè"
            />
          </div>
          <span className="rounded-md border border-border/80 bg-[#f4f5f7] px-2 py-1 text-xs text-muted-foreground">
            Tên (A - Z)
          </span>
          <span className="rounded-md border border-border/80 bg-[#f4f5f7] px-2 py-1 text-xs text-muted-foreground">
            Tất cả
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3">
          {isLoading ? (
            <ul className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-border/40">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </li>
              ))}
            </ul>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-destructive">Đã xảy ra lỗi</p>
              <p className="text-xs text-muted-foreground">Không tải được danh sách bạn bè.</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {filter.trim() ? (
                <>
                  <SearchX className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">Không tìm thấy</p>
                  <p className="mt-1 text-xs text-muted-foreground">Không có bạn bè khớp bộ lọc "{filter}".</p>
                </>
              ) : (
                <>
                  <Ghost className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">Trống</p>
                  <p className="mt-1 text-xs text-muted-foreground">Chưa có bạn bè.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ letter, items: rows }) => (
                <section key={letter}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {letter}
                  </h2>
                  <ul className="space-y-1">
                    {rows.map((row) => (
                      <li
                        key={row.friendshipId}
                        className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-border/40"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          {row.user.avatarUrl ? (
                            <AvatarImage src={row.user.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {userDisplayName(row.user).slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {userDisplayName(row.user)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{row.user.username}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground"
                              aria-label="Thêm thao tác"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setInfoFriend(row)
                              }}
                            >
                              Xem thông tin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (row.dmConversationId) {
                                  navigate(`/chat/${row.dmConversationId}`)
                                } else {
                                  navigate('/chat')
                                }
                              }}
                            >
                              Nhắn tin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAliasFriend(row)
                              }}
                            >
                              Đặt tên gợi nhớ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setBlockOpen(true)}
                            >
                              Chặn
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              Xóa bạn
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={infoFriend !== null} onOpenChange={(o) => !o && setInfoFriend(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xem thông tin</DialogTitle>
            <DialogDescription>Thông tin hồ sơ công khai của bạn bè.</DialogDescription>
          </DialogHeader>
          {infoFriend ? (
            <div className="flex flex-col items-center gap-5 pt-1">
              <Avatar className="h-24 w-24 ring-2 ring-border/60">
                {infoFriend.user.avatarUrl ? (
                  <AvatarImage src={infoFriend.user.avatarUrl} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback className="text-2xl font-semibold">
                  {userDisplayName(infoFriend.user).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="w-full space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tên</p>
                  <p className="mt-0.5 text-base font-semibold text-foreground">
                    {userDisplayName(infoFriend.user)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tên người dùng</p>
                  <p className="mt-0.5 font-mono text-[15px] text-foreground">
                    @{infoFriend.user.username}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Bio</p>
                  <p className="mt-0.5 min-h-5 whitespace-pre-wrap wrap-break-word text-foreground">
                    {infoFriend.user.bio?.trim()
                      ? infoFriend.user.bio
                      : 'Chưa có giới thiệu.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setInfoFriend(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aliasFriend !== null} onOpenChange={(o) => !o && setAliasFriend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt tên gợi nhớ</DialogTitle>
            <DialogDescription>Tính năng sắp có.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setAliasFriend(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Chặn người này?</DialogTitle>
            <DialogDescription>
              Tính năng chặn sắp có. Bạn sẽ không thể nhận tin nhắn từ người bị chặn sau khi triển khai.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBlockOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa bạn?</DialogTitle>
            <DialogDescription>
              Hủy kết bạn với{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget ? userDisplayName(deleteTarget.user) : ''}
              </span>
              ? Bạn có thể gửi lời mời lại sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMut.isPending}
              onClick={() => {
                if (deleteTarget) removeMut.mutate(deleteTarget.friendshipId)
              }}
            >
              {removeMut.isPending ? 'Đang xóa…' : 'Xóa bạn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
