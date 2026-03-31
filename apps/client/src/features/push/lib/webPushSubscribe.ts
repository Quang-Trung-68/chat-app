import { fetchVapidPublicKey, postPushSubscribe } from '../api/push.api'

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Đăng ký SW + push, gửi subscription lên server. Trả `true` nếu đã có subscription hợp lệ. */
export async function ensurePushSubscriptionRegistered(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const vapidPublicKey = await fetchVapidPublicKey()
  if (!vapidPublicKey) {
    if (import.meta.env.DEV) {
      console.warn(
        '[push] Thiếu VAPID_PUBLIC_KEY trên server — thêm vào apps/server/.env và khởi động lại.'
      )
    }
    return false
  }

  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await reg.update()

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  await postPushSubscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  })
  return true
}
