import type { Request, Response, NextFunction } from 'express'
import { getTurnCredentials } from './webrtc.service'

export async function getTurnCredentialsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const iceServers = await getTurnCredentials()
    res.json({ iceServers })
  } catch (e) {
    next(e)
  }
}
