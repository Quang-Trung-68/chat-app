import type { LegacyRef, RefObject } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { VoiceCallUiState } from '../types/voiceCall.types'
import type { VoicePeerInfo } from '../hooks/useVoiceCall'

const SF_CLOCK =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, sans-serif'

/** Chu vi stroke path (r=46 trong viewBox 100x100). */
const RING_C = 2 * Math.PI * 46

type VoiceCallOverlayProps = {
  open: boolean
  uiState: VoiceCallUiState
  peer: VoicePeerInfo | null
  error: string | null
  isMuted: boolean
  /** MM:SS khi đang thoại */
  callDurationLabel: string | null
  /** 0–1: vòng tròn chờ gọi (30s), chỉ outgoing */
  outboundRingProgress: number
  remoteAudioRef: RefObject<HTMLAudioElement | null>
  onAccept: () => void
  onReject: () => void
  onCancelOutgoing: () => void
  onEnd: () => void
  onToggleMute: () => void
}

export function VoiceCallOverlay({
  open,
  uiState,
  peer,
  error,
  isMuted,
  callDurationLabel,
  outboundRingProgress,
  remoteAudioRef,
  onAccept,
  onReject,
  onCancelOutgoing,
  onEnd,
  onToggleMute,
}: VoiceCallOverlayProps) {
  if (!open) return null

  const title = peer?.displayName ?? 'Cuộc gọi'
  const initial = title.slice(0, 1).toUpperCase()
  const showOutboundRing =
    uiState === 'outgoing_connecting' || uiState === 'outgoing_ringing'
  const p = Math.min(1, Math.max(0, outboundRingProgress))

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1a2d]/92 px-4 text-white backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="voice-call-title"
    >
      <audio ref={remoteAudioRef as LegacyRef<HTMLAudioElement>} autoPlay className="sr-only" />

      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <div className="relative flex h-[7.25rem] w-[7.25rem] shrink-0 items-center justify-center">
          {showOutboundRing ? (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="2.5"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - p)}
              />
            </svg>
          ) : null}
          <Avatar className="relative z-[1] h-24 w-24 border-2 border-white/20 shadow-lg">
            {peer?.avatarUrl ? <AvatarImage src={peer.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-[#0068ff]/30 text-3xl font-semibold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div>
          <h2 id="voice-call-title" className="text-xl font-semibold tracking-tight">
            {uiState === 'incoming' ? 'Cuộc gọi đến' : uiState === 'ended' ? 'Kết thúc cuộc gọi' : title}
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {uiState === 'outgoing_connecting' && 'Đang kết nối…'}
            {uiState === 'outgoing_ringing' && 'Đang đổ chuông…'}
            {uiState === 'incoming' && `${title} đang gọi bạn`}
            {uiState === 'connected' && 'Đang kết nối thoại'}
            {uiState === 'ended' && 'Cuộc gọi đã kết thúc'}
            {uiState === 'idle' && '…'}
          </p>
        </div>

        {uiState === 'connected' && callDurationLabel ? (
          <p
            className="text-lg font-medium tabular-nums tracking-tight text-emerald-400"
            style={{ fontFamily: SF_CLOCK }}
          >
            {callDurationLabel}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {uiState === 'outgoing_connecting' || uiState === 'outgoing_ringing' ? (
            <Button
              type="button"
              variant="destructive"
              className="gap-2 rounded-full px-6"
              onClick={onCancelOutgoing}
            >
              <PhoneOff className="h-4 w-4" />
              Huỷ
            </Button>
          ) : null}

          {uiState === 'incoming' ? (
            <>
              <Button
                type="button"
                className="gap-2 rounded-full bg-emerald-600 px-6 hover:bg-emerald-700"
                onClick={onAccept}
              >
                <Phone className="h-4 w-4" />
                Trả lời
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2 rounded-full px-6 text-foreground"
                onClick={onReject}
              >
                <PhoneOff className="h-4 w-4" />
                Từ chối
              </Button>
            </>
          ) : null}

          {uiState === 'connected' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full border-0 bg-white/15 text-white hover:bg-white/25"
                onClick={onToggleMute}
                aria-pressed={isMuted}
                title={isMuted ? 'Bật mic' : 'Tắt mic'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-2 rounded-full px-6"
                onClick={onEnd}
              >
                <PhoneOff className="h-4 w-4" />
                Kết thúc
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
