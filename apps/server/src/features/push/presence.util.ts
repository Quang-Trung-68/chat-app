import { getRedisCache } from '@/config/redis'

export function presenceUserKey(userId: string): string {
  return `presence:user:${userId}`
}

/** `true` khi user còn ít nhất một tab/socket (cùng mô hình Bước 8). */
export async function isUserPresenceOnline(userId: string): Promise<boolean> {
  const redis = getRedisCache()
  const v = await redis.get(presenceUserKey(userId))
  if (v === null) return false
  const n = parseInt(v, 10)
  return !Number.isNaN(n) && n > 0
}
