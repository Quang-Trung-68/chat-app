import { Phone, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CallMessagePayloadDto, MessageItemDto } from '@/features/messages/types/message.types'
import { formatMessageTime } from '../../utils/format'
import { formatCallDurationVerbose } from '@/features/call/hooks/useVoiceCall'

type CallMessageCardProps = {
  message: MessageItemDto
  payload: CallMessagePayloadDto
  viewerId: string | undefined
  mine: boolean
  /** Chỉ DM: hiện nút gọi lại */
  isDm: boolean
  showSenderNameOnBubble: boolean
  senderLabel: string
  onCallAgain?: () => void
}

function cardTitle(
  payload: CallMessagePayloadDto,
  viewerId: string | undefined
): string {
  const mineInitiated = payload.initiatorId === viewerId
  const audio = payload.callKind !== 'video'
  const kind = audio ? 'thoại' : 'video'
  const o = payload.outcome

  if (o === 'COMPLETED') {
    if (mineInitiated) return `Cuộc gọi ${kind} đi`
    return `Cuộc gọi ${kind} đến`
  }
  if (o === 'DECLINED') return `Cuộc gọi ${kind}`
  if (o === 'CANCELLED') {
    if (mineInitiated) return `Cuộc gọi ${kind} đi`
    return `Cuộc gọi nhỡ (${kind})`
  }
  if (o === 'MISSED' || o === 'FAILED') {
    if (mineInitiated) return `Cuộc gọi ${kind} đi`
    return `Cuộc gọi nhỡ (${kind})`
  }
  return `Cuộc gọi ${kind}`
}

function detailLine(
  payload: CallMessagePayloadDto,
  viewerId: string | undefined
): { text: string; missed: boolean; outgoingStyle: boolean } {
  const mineInitiated = payload.initiatorId === viewerId
  const o = payload.outcome

  if (o === 'COMPLETED') {
    const sec = payload.durationSeconds ?? 0
    return {
      text: formatCallDurationVerbose(Math.max(0, sec)),
      missed: false,
      outgoingStyle: mineInitiated,
    }
  }
  if (o === 'DECLINED') {
    return { text: 'Đã từ chối', missed: false, outgoingStyle: false }
  }
  if (o === 'CANCELLED') {
    if (mineInitiated) return { text: 'Đã huỷ', missed: false, outgoingStyle: true }
    return { text: 'Không trả lời', missed: true, outgoingStyle: false }
  }
  if (o === 'MISSED' || o === 'FAILED') {
    if (mineInitiated) return { text: 'Không có người nghe', missed: false, outgoingStyle: false }
    return { text: 'Cuộc gọi nhỡ', missed: true, outgoingStyle: false }
  }
  return { text: '', missed: false, outgoingStyle: mineInitiated }
}

export function CallMessageCard({
  message,
  payload,
  viewerId,
  mine,
  isDm,
  showSenderNameOnBubble,
  senderLabel,
  onCallAgain,
}: CallMessageCardProps) {
  const title = cardTitle(payload, viewerId)
  const { text: detailText, missed, outgoingStyle } = detailLine(payload, viewerId)
  const isVideo = payload.callKind === 'video'
  const Icon = missed ? PhoneMissed : isVideo ? Video : outgoingStyle ? PhoneOutgoing : Phone

  return (
    <div
      className={cn(
        'w-full max-w-[min(100%,16rem)] rounded-2xl px-3 py-2 text-left text-[15px] shadow-sm',
        mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-secondary-surface text-foreground'
      )}
    >
      {showSenderNameOnBubble ? (
        <p className={cn('mb-1 text-xs font-medium', mine ? 'text-primary-foreground/95' : 'text-primary')}>
          {senderLabel}
        </p>
      ) : null}
      <p
        className={cn(
          'text-[14px] font-semibold leading-snug',
          mine ? 'text-primary-foreground' : 'text-foreground'
        )}
      >
        {title}
      </p>
      <div
        className={cn(
          'mt-1.5 flex items-center gap-1.5 text-[13px]',
          mine ? 'text-white/85' : 'text-muted-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            missed && (mine ? 'text-red-300' : 'text-red-500'),
            !missed && outgoingStyle && (mine ? 'text-emerald-300' : 'text-emerald-600'),
            !missed && !outgoingStyle && !isVideo && (mine ? 'text-white/75' : 'text-muted-foreground')
          )}
          aria-hidden
        />
        <span>{detailText}</span>
      </div>
      {isDm && onCallAgain ? (
        <>
          <div
            className={cn(
              'my-1.5 border-t',
              mine ? 'border-white/20' : 'border-border/60'
            )}
          />
          <button
            type="button"
            className={cn(
              'w-full py-0.5 text-center text-[11px] font-medium leading-tight transition-opacity hover:opacity-90',
              mine
                ? 'text-primary-foreground underline decoration-white/50 underline-offset-2'
                : 'text-primary underline decoration-primary/40 underline-offset-2'
            )}
            onClick={onCallAgain}
          >
            Gọi lại
          </button>
        </>
      ) : null}
      <div
        className={cn(
          'mt-1 text-[10px]',
          mine ? 'text-white/70' : 'text-muted-foreground/80'
        )}
      >
        <span>{formatMessageTime(message.createdAt)}</span>
      </div>
    </div>
  )
}
