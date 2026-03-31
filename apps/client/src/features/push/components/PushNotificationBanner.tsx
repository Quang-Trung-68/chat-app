import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { ensurePushSubscriptionRegistered } from '../lib/webPushSubscribe'

const SESSION_DISMISS = 'push-prompt-dismiss-session'

/**
 * Khi đã đăng nhập: nếu quyền thông báo `default` — hiện banner (mỗi phiên có thể đóng tạm).
 * Nếu `granted` — đăng ký push im lặng (một lần mỗi khi vào app).
 */
export function PushNotificationBanner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || typeof Notification === 'undefined') return

    const run = async () => {
      if (Notification.permission === 'granted') {
        try {
          await ensurePushSubscriptionRegistered()
        } catch {
          /* ignore */
        }
        return
      }

      if (Notification.permission !== 'default') return
      if (sessionStorage.getItem(SESSION_DISMISS)) return
      setShow(true)
    }

    void run()
  }, [isAuthenticated])

  if (!isAuthenticated || !show) return null

  const onEnable = async () => {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        await ensurePushSubscriptionRegistered()
        setShow(false)
      }
    } finally {
      setBusy(false)
    }
  }

  const onDismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS, '1')
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Bật thông báo"
      className="fixed bottom-0 left-0 right-0 z-60 border-t border-border/80 bg-sidebar px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] md:left-[60px]"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Bật thông báo đẩy</p>
            <p className="mt-0.5 text-xs leading-snug text-white/85">
              Nhận tin khi không mở tab — giống Zalo/Messenger. Chỉ gửi khi bạn không online trên web.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={onDismiss}
            disabled={busy}
          >
            Để sau
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-white text-sidebar hover:bg-white/90"
            onClick={onEnable}
            disabled={busy}
          >
            {busy ? 'Đang bật…' : 'Bật thông báo'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-white hover:bg-white/10"
            onClick={onDismiss}
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
