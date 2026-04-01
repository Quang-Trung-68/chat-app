import type { RefObject } from 'react'
import { Loader2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { VoiceCallUiState } from '../types/voiceCall.types'
import type { VoicePeerInfo } from '../hooks/useVoiceCall'

type VoiceCallOverlayProps = {
  open: boolean
  uiState: VoiceCallUiState
  peer: VoicePeerInfo | null
  error: string | null
  isMuted: boolean
  /** MM:SS khi đang thoại */
  callDurationLabel: string | null
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

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1a2d]/92 px-4 text-white backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="voice-call-title"
    >
      <audio ref={remoteAudioRef} autoPlay className="sr-only" />

      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <Avatar className="h-24 w-24 border-2 border-white/20 shadow-lg">
          {peer?.avatarUrl ? <AvatarImage src={peer.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-[#0068ff]/30 text-3xl font-semibold text-white">
            {initial}
          </AvatarFallback>
        </Avatar>

        <div>
          <h2 id="voice-call-title" className="text-xl font-semibold tracking-tight">
            {uiState === 'incoming' ? 'Cuộc gọi đến' : uiState === 'ended' ? 'Kết thúc cuộc gọi' : title}
          </h2>
          <p className="mt-1 text-sm text-white/75">
            {uiState === 'outgoing' && 'Đang gọi…'}
            {uiState === 'incoming' && `${title} đang gọi bạn`}
            {uiState === 'connected' && 'Đang kết nối thoại'}
            {uiState === 'ended' && 'Cuộc gọi đã kết thúc'}
            {uiState === 'idle' && '…'}
          </p>
        </div>

        {uiState === 'connected' && callDurationLabel ? (
          <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-white">
            {callDurationLabel}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {uiState === 'outgoing' ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
              <Button
                type="button"
                variant="destructive"
                className="gap-2 rounded-full px-6"
                onClick={onCancelOutgoing}
              >
                <PhoneOff className="h-4 w-4" />
                Huỷ
              </Button>
            </>
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
