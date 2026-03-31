import { pushRepository } from './push.repository'
import type { z } from 'zod'
import type { pushSubscribeBodySchema } from './push.validation'

type SubscribeBody = z.infer<typeof pushSubscribeBodySchema>

export const pushService = {
  async subscribe(userId: string, body: SubscribeBody, userAgent: string | null) {
    await pushRepository.upsertSubscription({
      userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    })
    return { ok: true as const }
  },

  async unsubscribe(userId: string, endpoint: string) {
    await pushRepository.deleteByEndpointAndUser(endpoint, userId)
    return { ok: true as const }
  },
}
