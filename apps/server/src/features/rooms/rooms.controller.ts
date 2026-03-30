import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { io } from '@/features/sockets/socketServer'
import { AppError } from '@/shared/errors/AppError'
import { emitReceiptReadToRoom } from '@/features/sockets/receiptBroadcast'
import { roomsService } from './rooms.service'
import type { CreateGroupBody } from './rooms.types'

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const data = await roomsService.listRooms(userId)
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const body = req.body as CreateGroupBody
    const data = await roomsService.createGroup(userId, body)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function markRoomRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const idParsed = z.string().cuid().safeParse(req.params.id)
    if (!idParsed.success) {
      return next(new AppError('ID room không hợp lệ', 400, 'VALIDATION_ERROR'))
    }
    const conversationId = idParsed.data

    const lastReadAt = await roomsService.markRoomAsRead(userId, conversationId)
    emitReceiptReadToRoom(io, conversationId, userId, lastReadAt)

    res.json({
      success: true,
      data: { lastReadAt: lastReadAt.toISOString() },
    })
  } catch (e) {
    next(e)
  }
}
