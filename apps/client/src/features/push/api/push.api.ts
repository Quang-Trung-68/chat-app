import { api } from '@/services/api'

export async function fetchVapidPublicKey(): Promise<string | null> {
  const { data } = await api.get<{ success: boolean; data: { publicKey: string | null } }>(
    '/push/vapid-public-key'
  )
  return data.data.publicKey
}

export async function postPushSubscribe(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post('/push/subscribe', subscription)
}

export async function postPushUnsubscribe(endpoint: string): Promise<void> {
  await api.post('/push/unsubscribe', { endpoint })
}
