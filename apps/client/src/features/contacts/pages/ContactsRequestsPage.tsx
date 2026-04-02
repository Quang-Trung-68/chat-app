import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { userDisplayName } from '@/lib/userDisplay'
import { useFriendsPendingQuery } from '@/features/friends/hooks/useFriendsPendingQuery'
import { postAcceptFriend, deleteFriendship } from '@/features/friends/api/friends.api'
import { invalidateFriendQueries } from '@/features/friends/invalidateFriendQueries'

function invalidateFriendsLists(queryClient: ReturnType<typeof useQueryClient>) {
  invalidateFriendQueries(queryClient)
}

export function ContactsRequestsPage() {
  const queryClient = useQueryClient()
  const { data: pending, isLoading: pendingLoading, isError: incError } =
    useFriendsPendingQuery(true)
  const incoming = pending?.incoming
  const outgoing = pending?.outgoing

  const acceptMut = useMutation({
    mutationFn: (id: string) => postAcceptFriend(id),
    onSuccess: () => invalidateFriendsLists(queryClient),
  })

  const declineMut = useMutation({
    mutationFn: (id: string) => deleteFriendship(id),
    onSuccess: () => invalidateFriendsLists(queryClient),
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => deleteFriendship(id),
    onSuccess: () => invalidateFriendsLists(queryClient),
  })

  const busyIncoming = acceptMut.isPending || declineMut.isPending
  const busyOutgoing = revokeMut.isPending

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 py-3">
        <UserPlus className="h-5 w-5 text-primary" aria-hidden />
        <h1 className="text-base font-semibold">Lời mời kết bạn</h1>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0 px-4 py-4">
          <hr className="border-border/80" />
          <h2 className="pt-4 text-sm font-semibold text-foreground">Lời mời đang chờ</h2>
          <div className="mt-3 space-y-2">
            {pendingLoading ? (
              <ul className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-border/40">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : incError ? (
              <p className="text-sm text-destructive">Không tải được lời mời đang chờ.</p>
            ) : !incoming?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/50">
                <Inbox className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">Không có lời mời mới</p>
                <p className="mt-1 text-xs text-muted-foreground">Bạn chưa có lời mời kết bạn nào.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {incoming.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-border/40"
                  >
                    <Avatar className="h-10 w-10">
                      {row.requester.avatarUrl ? (
                        <AvatarImage src={row.requester.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {userDisplayName(row.requester).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{userDisplayName(row.requester)}</p>
                      <p className="text-xs text-muted-foreground">@{row.requester.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={busyIncoming}
                        onClick={() => acceptMut.mutate(row.id)}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyIncoming}
                        onClick={() => declineMut.mutate(row.id)}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <hr className="my-8 border-t border-border/80" />

          <h2 className="text-sm font-semibold text-foreground">Lời mời đã gửi</h2>
          <div className="mt-3 space-y-2">
            {pendingLoading ? (
              <ul className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-border/40">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </li>
                ))}
              </ul>
            ) : !outgoing?.length ? (
              <p className="text-sm text-muted-foreground">Bạn chưa gửi lời mời kết bạn nào.</p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-border/40"
                  >
                    <Avatar className="h-10 w-10">
                      {row.addressee.avatarUrl ? (
                        <AvatarImage src={row.addressee.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {userDisplayName(row.addressee).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{userDisplayName(row.addressee)}</p>
                      <p className="text-xs text-muted-foreground">@{row.addressee.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyOutgoing}
                      onClick={() => revokeMut.mutate(row.id)}
                    >
                      Thu hồi
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
