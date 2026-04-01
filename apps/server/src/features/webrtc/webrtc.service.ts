import { env } from '@/config/env'
import { AppError } from '@/shared/errors/AppError'
import type { IceServer } from './webrtc.types'

const METERED_CREDENTIALS_ERROR = 'Không thể lấy TURN credentials'

export async function getTurnCredentials(): Promise<IceServer[]> {
  const appName = env.METERED_APP_NAME?.trim()
  const apiKey = env.METERED_API_KEY?.trim()
  if (!appName || !apiKey) {
    throw new AppError('TURN server chưa được cấu hình', 500, 'TURN_NOT_CONFIGURED')
  }

  const url = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`

  try {
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()
    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      console.error('[webrtc] Metered TURN: response không phải JSON', text.slice(0, 200))
      throw new AppError(METERED_CREDENTIALS_ERROR, 502, 'TURN_CREDENTIALS_UNAVAILABLE')
    }

    if (!res.ok) {
      console.error('[webrtc] Metered TURN:', res.status, text.slice(0, 300))
      throw new AppError(METERED_CREDENTIALS_ERROR, 502, 'TURN_CREDENTIALS_UNAVAILABLE')
    }

    if (!Array.isArray(parsed)) {
      console.error('[webrtc] Metered TURN: expected JSON array, got', typeof parsed)
      throw new AppError(METERED_CREDENTIALS_ERROR, 502, 'TURN_CREDENTIALS_UNAVAILABLE')
    }

    return parsed as IceServer[]
  } catch (e) {
    if (e instanceof AppError) throw e
    console.error('[webrtc] Metered TURN fetch failed', e)
    throw new AppError(METERED_CREDENTIALS_ERROR, 502, 'TURN_CREDENTIALS_UNAVAILABLE')
  }
}
