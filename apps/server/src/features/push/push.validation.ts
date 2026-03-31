import { z } from 'zod'

/** Body từ `PushManager.subscribe()` / `JSON.stringify(subscription)`. */
export const pushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
})
