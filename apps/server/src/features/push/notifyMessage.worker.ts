import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import webpush from 'web-push'
import type { MessageType } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { pushRepository } from './push.repository'
import { isUserPresenceOnline } from './presence.util'
import {
  NOTIFY_MESSAGE_JOB,
  NOTIFY_MESSAGE_QUEUE,
  type NotifyMessageJobPayload,
} from './notifyMessage.queue'

function previewFromMessage(m: {
  type: MessageType
  content: string | null
}): string {
  if (m.type === 'IMAGE') return 'Đã gửi ảnh'
  if (m.type === 'FILE') return 'Đã gửi file'
  const c = m.content?.trim()
  if (c) return c.length > 120 ? `${c.slice(0, 117)}…` : c
  return 'Tin nhắn mới'
}

function senderLabel(displayName: string | null, username: string): string {
  const d = displayName?.trim()
  return d || username
}

export function startNotifyMessageWorker(): void {
  if (!env.VAPID_PUBLIC_KEY?.trim() || !env.VAPID_PRIVATE_KEY?.trim()) {
    console.warn('[Push worker] Thiếu VAPID — worker không khởi động.')
    return
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  )

  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

  const worker = new Worker<NotifyMessageJobPayload>(
    NOTIFY_MESSAGE_QUEUE,
    async (job) => {
      if (job.name !== NOTIFY_MESSAGE_JOB) return

      const { messageId, conversationId, senderId } = job.data

      const message = await prisma.message.findFirst({
        where: { id: messageId, conversationId, deletedAt: null },
        select: {
          id: true,
          type: true,
          content: true,
          sender: { select: { displayName: true, username: true } },
        },
      })
      if (!message) return

      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, deletedAt: null },
        select: { type: true, name: true },
      })
      if (!conversation) return

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId, deletedAt: null },
        select: { userId: true },
      })

      const recipientIds = participants.map((p) => p.userId).filter((id) => id !== senderId)
      const preview = previewFromMessage(message)
      const senderName = senderLabel(message.sender.displayName, message.sender.username)

      const title =
        conversation.type === 'DM'
          ? senderName
          : conversation.name?.trim() || 'Nhóm chat'
      const body =
        conversation.type === 'DM' ? preview : `${senderName}: ${preview}`

      const openUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/chat/${conversationId}`

      const payload = JSON.stringify({
        title,
        body,
        url: openUrl,
        conversationId,
        messageId,
      })

      for (const userId of recipientIds) {
        let online = await isUserPresenceOnline(userId)
        if (online) {
          await new Promise((r) => setTimeout(r, 3500))
          online = await isUserPresenceOnline(userId)
        }
        if (online) {
          if (env.NODE_ENV === 'development') {
            console.log('[Push worker] bỏ qua (user vẫn online trên web)', userId.slice(0, 8))
          }
          continue
        }

        const subs = await pushRepository.listSubscriptionsByUserId(userId)
        if (subs.length === 0 && env.NODE_ENV === 'development') {
          console.log('[Push worker] không có subscription push', userId.slice(0, 8))
        }
        for (const row of subs) {
          const sub = {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          }
          try {
            await webpush.sendNotification(sub, payload, {
              TTL: 60 * 60 * 12,
              urgency: 'normal',
            })
            if (env.NODE_ENV === 'development') {
              console.log('[Push worker] đã gửi tới endpoint', row.endpoint.slice(0, 48) + '…')
            }
          } catch (err: unknown) {
            const status = typeof err === 'object' && err && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined
            if (status === 404 || status === 410) {
              await pushRepository.deleteByEndpoint(row.endpoint)
            } else if (env.NODE_ENV === 'development') {
              console.warn('[Push worker] send failed', status, row.endpoint.slice(0, 48))
            }
          }
        }
      }
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    console.error('[Push worker] job failed', job?.id, err?.message)
  })
}
