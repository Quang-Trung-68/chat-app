/** File đặt trong `public/sounds/` — bạn thêm ringtone.mp3 và belltone.mp3 */
export const CALL_SOUND_URLS = {
  /** Nhạc chờ — người gọi khi đang đổ chuông (outgoing) */
  ringback: '/sounds/ringtone.mp3',
  /** Chuông — người nhận khi có cuộc gọi đến (incoming) */
  bell: '/sounds/belltone.mp3',
} as const

export function playLoopingCallSound(url: string, volume = 0.45): HTMLAudioElement {
  const a = new Audio(url)
  a.loop = true
  a.volume = volume
  void a.play().catch(() => {
    /* autoplay bị chặn hoặc file chưa có */
  })
  return a
}

export function stopCallSound(a: HTMLAudioElement | null) {
  if (!a) return
  a.pause()
  a.src = ''
}
