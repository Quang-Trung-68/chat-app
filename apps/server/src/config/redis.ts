import Redis from 'ioredis'
import { env } from '@/config/env'

/** Redis cho typing/presence (SETEX, INCR/DECR). */
let cacheRedis: Redis | null = null
/** Pub/sub cho `@socket.io/redis-adapter` — không dùng cho lệnh thường. */
let pubClient: Redis | null = null
let subClient: Redis | null = null

export function getRedisCache(): Redis {
  if (!cacheRedis) {
    throw new Error('Redis chưa được khởi tạo — gọi initRedis() trước')
  }
  return cacheRedis
}

export function getRedisAdapterClients(): { pubClient: Redis; subClient: Redis } {
  if (!pubClient || !subClient) {
    throw new Error('Redis adapter chưa được khởi tạo — gọi initRedis() trước')
  }
  return { pubClient, subClient }
}

const redisOptions = {
  maxRetriesPerRequest: null as null,
}

/**
 * Kết nối Redis (bắt buộc cho Socket.IO adapter + typing/presence).
 * Gọi một lần trước khi `initSocketServer`.
 */
export async function initRedis(): Promise<void> {
  if (cacheRedis) return

  cacheRedis = new Redis(env.REDIS_URL, redisOptions)
  pubClient = new Redis(env.REDIS_URL, redisOptions)
  subClient = pubClient.duplicate()

  await Promise.all([cacheRedis.ping(), pubClient.ping(), subClient.ping()])
}
