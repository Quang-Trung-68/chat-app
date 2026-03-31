import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '@/config/env'

export const NOTIFY_MESSAGE_QUEUE = 'notify-message'
export const NOTIFY_MESSAGE_JOB = 'notify:message'

export type NotifyMessageJobPayload = {
  messageId: string
  conversationId: string
  senderId: string
}

let connection: IORedis | null = null
let notifyQueue: Queue<NotifyMessageJobPayload> | null = null

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function getNotifyMessageQueue(): Queue<NotifyMessageJobPayload> | null {
  if (!env.VAPID_PUBLIC_KEY?.trim() || !env.VAPID_PRIVATE_KEY?.trim()) {
    return null
  }
  if (!notifyQueue) {
    notifyQueue = new Queue<NotifyMessageJobPayload>(NOTIFY_MESSAGE_QUEUE, {
      connection: getConnection(),
    })
  }
  return notifyQueue
}

export async function enqueueNotifyMessageJob(payload: NotifyMessageJobPayload): Promise<void> {
  const q = getNotifyMessageQueue()
  if (!q) return
  await q.add(NOTIFY_MESSAGE_JOB, payload, {
    /** Chờ socket disconnect / cập nhật presence sau khi đóng tab (tránh coi user vẫn “online”). */
    delay: 2500,
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}
