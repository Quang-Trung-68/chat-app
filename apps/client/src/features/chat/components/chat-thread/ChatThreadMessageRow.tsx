import { Crown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { RoomListItem } from '@/features/rooms/types/room.types'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { displayNameForMessageSender } from '@/lib/userDisplay'
import { resolveParentPreview } from '../../utils/parentPreview'
import { MessageBubbleActions } from '../MessageBubbleActions'
import { MessageReactionHoverLayer } from '../MessageReactions'
import { ChatThreadMessageBubble } from './ChatThreadMessageBubble'
import { CallMessageCard } from './CallMessageCard'

type PendingMap = Record<string, { previewUrls?: string[] }>

type ChatThreadMessageRowProps = {
  message: MessageItemDto
  merged: MessageItemDto[]
  currentUserId: string | undefined
  room: RoomListItem | undefined
  groupOwnerId: string | undefined
  conversationId: string
  pinnedIds: Set<string>
  pinSlotsLeft: boolean
  pinPending: boolean
  unpinPending: boolean
  onReply: (m: MessageItemDto) => void
  onPin: (messageId: string) => void
  onUnpin: (messageId: string) => void
  scrollToMessageInThread: (messageId: string) => Promise<void>
  pendingByMessageId: PendingMap
  onOpenLightbox: (urls: string[], startIndex: number) => void
  /** DM: gọi lại từ thẻ lịch sử cuộc gọi */
  onCallAgain?: () => void
}

export function ChatThreadMessageRow({
  message: m,
  merged,
  currentUserId,
  room,
  groupOwnerId,
  conversationId,
  pinnedIds,
  pinSlotsLeft,
  pinPending,
  unpinPending,
  onReply,
  onPin,
  onUnpin,
  scrollToMessageInThread,
  pendingByMessageId,
  onOpenLightbox,
  onCallAgain,
}: ChatThreadMessageRowProps) {
  const mine = m.sender.id === currentUserId
  const senderLabel = displayNameForMessageSender(m.sender, room?.participants)
  const isDm = room?.type === 'DM'
  const showSenderNameOnBubble = !mine && !isDm
  const parentPreview = resolveParentPreview(m, merged)
  const isGroupAdminMessage =
    room?.type === 'GROUP' &&
    groupOwnerId !== undefined &&
    m.sender.id === groupOwnerId

  if (m.messageType === 'CALL' && m.callPayload) {
    return (
      <li
        data-message-id={m.id}
        className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
      >
        {!mine ? (
          <div className="relative mt-0.5 h-8 w-8 shrink-0">
            <Avatar className="h-8 w-8">
              {m.sender.avatarUrl ? <AvatarImage src={m.sender.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-[10px]">
                {senderLabel.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isGroupAdminMessage ? (
              <span
                className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-400/70"
                title="Quản trị viên"
                aria-hidden
              >
                <Crown className="h-[7px] w-[7px] text-amber-500" strokeWidth={2.75} />
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn('group/msg flex w-max max-w-[min(100%,28rem)] items-end gap-1.5')}
        >
          {mine ? (
            <>
              <MessageBubbleActions
                conversationId={conversationId}
                message={m}
                mine={mine}
                isPinned={pinnedIds.has(m.id)}
                pinSlotsLeft={pinSlotsLeft}
                pinPending={pinPending}
                unpinPending={unpinPending}
                onReply={() => onReply(m)}
                onPin={() => onPin(m.id)}
                onUnpin={() => onUnpin(m.id)}
              />
              <div className="relative w-fit max-w-full min-w-0 pb-3">
                <CallMessageCard
                  message={m}
                  payload={m.callPayload}
                  viewerId={currentUserId}
                  mine={mine}
                  isDm={Boolean(isDm)}
                  showSenderNameOnBubble={showSenderNameOnBubble}
                  senderLabel={senderLabel}
                  onCallAgain={onCallAgain}
                />
                <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
              </div>
            </>
          ) : (
            <>
              <div className="relative w-fit max-w-full min-w-0 pb-3">
                <CallMessageCard
                  message={m}
                  payload={m.callPayload}
                  viewerId={currentUserId}
                  mine={mine}
                  isDm={Boolean(isDm)}
                  showSenderNameOnBubble={showSenderNameOnBubble}
                  senderLabel={senderLabel}
                  onCallAgain={onCallAgain}
                />
                <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
              </div>
              <MessageBubbleActions
                conversationId={conversationId}
                message={m}
                mine={mine}
                isPinned={pinnedIds.has(m.id)}
                pinSlotsLeft={pinSlotsLeft}
                pinPending={pinPending}
                unpinPending={unpinPending}
                onReply={() => onReply(m)}
                onPin={() => onPin(m.id)}
                onUnpin={() => onUnpin(m.id)}
              />
            </>
          )}
        </div>
      </li>
    )
  }

  return (
    <li
      data-message-id={m.id}
      className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}
    >
      {!mine ? (
        <div className="relative mt-0.5 h-8 w-8 shrink-0">
          <Avatar className="h-8 w-8">
            {m.sender.avatarUrl ? <AvatarImage src={m.sender.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-[10px]">
              {senderLabel.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isGroupAdminMessage ? (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-400/70"
              title="Quản trị viên"
              aria-hidden
            >
              <Crown className="h-[7px] w-[7px] text-amber-500" strokeWidth={2.75} />
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn('group/msg flex w-max max-w-[min(100%,28rem)] items-end gap-1.5')}
      >
        {mine ? (
          <>
            <MessageBubbleActions
              conversationId={conversationId}
              message={m}
              mine={mine}
              isPinned={pinnedIds.has(m.id)}
              pinSlotsLeft={pinSlotsLeft}
              pinPending={pinPending}
              unpinPending={unpinPending}
              onReply={() => onReply(m)}
              onPin={() => onPin(m.id)}
              onUnpin={() => onUnpin(m.id)}
            />
            <div className="relative w-fit max-w-full min-w-0 pb-3">
              <ChatThreadMessageBubble
                message={m}
                variant="mine"
                showSenderNameOnBubble={showSenderNameOnBubble}
                senderLabel={senderLabel}
                isGroupAdminMessage={Boolean(isGroupAdminMessage)}
                parentPreview={parentPreview}
                isDm={Boolean(isDm)}
                pendingByMessageId={pendingByMessageId}
                onNavigateParent={
                  parentPreview && !parentPreview.isDeleted
                    ? () => void scrollToMessageInThread(parentPreview.id)
                    : undefined
                }
                onOpenLightbox={onOpenLightbox}
              />
              <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
            </div>
          </>
        ) : (
          <>
            <div className="relative w-fit max-w-full min-w-0 pb-3">
              <ChatThreadMessageBubble
                message={m}
                variant="theirs"
                showSenderNameOnBubble={showSenderNameOnBubble}
                senderLabel={senderLabel}
                isGroupAdminMessage={Boolean(isGroupAdminMessage)}
                parentPreview={parentPreview}
                isDm={Boolean(isDm)}
                pendingByMessageId={pendingByMessageId}
                onNavigateParent={
                  parentPreview && !parentPreview.isDeleted
                    ? () => void scrollToMessageInThread(parentPreview.id)
                    : undefined
                }
                onOpenLightbox={onOpenLightbox}
              />
              <MessageReactionHoverLayer message={m} conversationId={conversationId} mine={mine} />
            </div>
            <MessageBubbleActions
              conversationId={conversationId}
              message={m}
              mine={mine}
              isPinned={pinnedIds.has(m.id)}
              pinSlotsLeft={pinSlotsLeft}
              pinPending={pinPending}
              unpinPending={unpinPending}
              onReply={() => onReply(m)}
              onPin={() => onPin(m.id)}
              onUnpin={() => onUnpin(m.id)}
            />
          </>
        )}
      </div>
    </li>
  )
}
