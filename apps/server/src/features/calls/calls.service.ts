import type { Server } from 'socket.io'
import { MessageType as MT } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { SOCKET_EVENTS } from '@chat-app/shared-constants'
import { messagesRepository } from '@/features/messages/messages.repository'
import { messagesService } from '@/features/messages/messages.service'
import type { CallMessagePayloadDto } from '@/features/messages/messages.types'
import { enqueueNotifyMissedCallJob } from '@/features/push/notifyMessage.queue'

export type CallEndReason = 'hangup' | 'decline' | 'cancel' | 'timeout' | 'failed'

export type CallLogOutcome = CallMessagePayloadDto['outcome']

export function mapEndReasonToOutcome(
  reason: CallEndReason,
  wasAnswered: boolean
): CallLogOutcome {
  if (wasAnswered && reason === 'hangup') return 'COMPLETED'
  if (wasAnswered) return 'COMPLETED'
  if (reason === 'decline') return 'DECLINED'
  if (reason === 'cancel') return 'CANCELLED'
  if (reason === 'timeout') return 'MISSED'
  if (reason === 'failed') return 'FAILED'
  if (reason === 'hangup') return 'CANCELLED'
  return 'FAILED'
}

export async function getOtherDmParticipant(
  conversationId: string,
  userId: string
): Promise<string | null> {
  const parts = await prisma.conversationParticipant.findMany({
    where: { conversationId, deletedAt: null },
    select: { userId: true },
  })
  if (parts.length !== 2) return null
  const other = parts.find((p) => p.userId !== userId)
  return other?.userId ?? null
}

function shouldNotifyMissedPush(outcome: CallLogOutcome): boolean {
  return outcome === 'CANCELLED' || outcome === 'MISSED' || outcome === 'FAILED'
}

export async function finalizeDmCallAndBroadcast(
  io: Server,
  params: {
    conversationId: string
    callId: string
    initiatorId: string
    outcome: CallLogOutcome
    durationSeconds: number | null
    callKind: 'audio' | 'video'
  }
): Promise<void> {
  const { conversationId, callId, initiatorId, outcome, durationSeconds, callKind } = params

  const existing = await prisma.message.findFirst({
    where: { callId },
    select: { id: true },
  })
  if (existing) return

  const payload: CallMessagePayloadDto = {
    callId,
    callKind,
    outcome,
    durationSeconds:
      outcome === 'COMPLETED' && durationSeconds !== null
        ? Math.max(0, Math.min(durationSeconds, 86400))
        : null,
    initiatorId,
  }

  const created = await messagesRepository.createMessage({
    conversationId,
    senderId: initiatorId,
    type: MT.CALL,
    content: JSON.stringify(payload),
    fileUrl: null,
    fileName: null,
    fileSize: null,
    parentId: null,
    callId,
  })

  const message = messagesService.mapRowToDto(created, initiatorId)
  io.to(conversationId).emit(SOCKET_EVENTS.CHAT_NEW, { conversationId, message })

  if (shouldNotifyMissedPush(outcome)) {
    const calleeId = await getOtherDmParticipant(conversationId, initiatorId)
    if (calleeId && calleeId !== initiatorId) {
      const caller = await prisma.user.findFirst({
        where: { id: initiatorId, deletedAt: null },
        select: { displayName: true, username: true },
      })
      const callerLabel =
        caller?.displayName?.trim() || caller?.username?.trim() || 'Cuộc gọi'
      void enqueueNotifyMissedCallJob({
        conversationId,
        calleeUserId: calleeId,
        callerDisplayLabel: callerLabel,
      }).catch(() => {
        /* optional queue */
      })
    }
  }
}
