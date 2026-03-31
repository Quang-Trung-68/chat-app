import { create } from 'zustand'

type Flash = { line: string; until: number }

type TitleBarState = {
  flash: Flash | null
  /** Dòng hiển thị tạm trên `document.title` (tab ẩn + tin đến). */
  setFlashLine: (line: string, durationMs?: number) => void
  clearFlash: () => void
}

export const useTitleBarStore = create<TitleBarState>((set, get) => ({
  flash: null,
  setFlashLine: (line, durationMs = 8000) => {
    const until = Date.now() + durationMs
    set({ flash: { line, until } })
    window.setTimeout(() => {
      const cur = get().flash
      if (cur?.until === until) set({ flash: null })
    }, durationMs)
  },
  clearFlash: () => set({ flash: null }),
}))
