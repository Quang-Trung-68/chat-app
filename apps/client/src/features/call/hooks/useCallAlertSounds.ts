import { useEffect, useRef } from 'react'
import type { VoiceCallUiState } from '../types/voiceCall.types'
import { CALL_SOUND_URLS, playLoopingCallSound, stopCallSound } from '../lib/callSounds'

/** Nhạc chờ (ringtone) khi outgoing; chuông (belltone) khi incoming. */
export function useCallAlertSounds(uiState: VoiceCallUiState) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    stopCallSound(audioRef.current)
    audioRef.current = null

    if (uiState === 'outgoing') {
      audioRef.current = playLoopingCallSound(CALL_SOUND_URLS.ringback)
    } else if (uiState === 'incoming') {
      audioRef.current = playLoopingCallSound(CALL_SOUND_URLS.bell)
    }

    return () => {
      stopCallSound(audioRef.current)
      audioRef.current = null
    }
  }, [uiState])
}
