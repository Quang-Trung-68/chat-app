import { getRedisCache } from '@/config/redis'

/** SET các `socket.id` — tránh race INCR/DECR async (ghost online khi DECR chạy trước INCR). */
export function presenceUserKey(userId: string): string {
  return `presence:sockets:${userId}`
}

/** `true` khi user còn ít nhất một socket (theo SCARD). */
export async function isUserPresenceOnline(userId: string): Promise<boolean> {
  const redis = getRedisCache()
  const n = await redis.scard(presenceUserKey(userId))
  return n > 0
}
