import type { Request, Response, NextFunction } from 'express'
import type { z } from 'zod'
import { messagesService } from './messages.service'
import type { CreateMessageBody } from './messages.types'
import { listMessagesQuerySchema, searchMessagesQuerySchema } from './messages.validation'

type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
type SearchMessagesQuery = z.infer<typeof searchMessagesQuerySchema>

export async function listMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const conversationId = req.params.id
    const q = req.query as unknown as ListMessagesQuery
    const data = await messagesService.listMessages(userId, conversationId, {
      cursor: q.cursor,
      limit: q.limit,
    })
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function createMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const conversationId = req.params.id
    const body = req.body as CreateMessageBody
    const data = await messagesService.createMessage(userId, conversationId, body)
    res.status(201).json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function searchMessagesInRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const conversationId = req.params.id
    const q = req.query as unknown as SearchMessagesQuery
    const data = await messagesService.searchMessagesInRoom(userId, conversationId, {
      q: q.q,
      cursor: q.cursor,
      limit: q.limit,
    })
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}

export async function searchMessagesGlobal(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const q = req.query as unknown as SearchMessagesQuery
    const data = await messagesService.searchMessagesGlobal(userId, {
      q: q.q,
      cursor: q.cursor,
      limit: q.limit,
    })
    res.json({ success: true, data })
  } catch (e) {
    next(e)
  }
}
