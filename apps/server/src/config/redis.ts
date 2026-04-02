import Redis from 'ioredis'
import { env } from '@/config/env'

/** Redis cho typing/presence (SETEX, INCR/DECR). */
let cacheRedis: Redis | null = null
/** Pub/sub cho `@socket.io/redis-adapter` — không dùng cho lệnh thường. */
let pubClient: Redis | null = null
let subClient: Redis | null = null

/** Khớp `presence.util` — SET các socket.id đang mở. */
const PRESENCE_SOCKETS_KEY_PREFIX = 'presence:sockets:'
/** Legacy: bộ đếm string (INCR/DECR) — xóa khi khởi động / khi user connect. */
const LEGACY_PRESENCE_COUNTER_PREFIX = 'presence:user:'

/** Fallback in-memory khi Redis không chạy (chỉ dev). */
let memoryCache: InMemoryRedisLike | null = null

/** `true` khi đã kết nối Redis thật (ping OK). */
export let redisAdapterEnabled = false

function attachQuietErrorHandler(client: Redis, label: string) {
  client.on('error', (err: Error) => {
    if (env.NODE_ENV === 'development') {
      console.warn(`[Redis ${label}]`, err.message)
    }
  })
}

/** Tối thiểu API typing/presence (Promise). */
export type RedisCacheLike = {
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  get(key: string): Promise<string | null>
  del(...keys: string[]): Promise<number>
  sadd(key: string, member: string): Promise<number>
  srem(key: string, member: string): Promise<number>
  scard(key: string): Promise<number>
}

class InMemoryRedisLike implements RedisCacheLike {
  private strings = new Map<string, string>()
  /** Presence: SET socket.id theo user. */
  private presenceSets = new Map<string, Set<string>>()
  private ttlTimers = new Map<string, ReturnType<typeof setTimeout>>()

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const prev = this.ttlTimers.get(key)
    if (prev) clearTimeout(prev)
    this.strings.set(key, value)
    const t = setTimeout(() => {
      this.strings.delete(key)
      this.ttlTimers.delete(key)
    }, seconds * 1000)
    this.ttlTimers.set(key, t)
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0
    for (const key of keys) {
      const timer = this.ttlTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.ttlTimers.delete(key)
      }
      let removed = false
      if (this.presenceSets.has(key)) {
        this.presenceSets.delete(key)
        removed = true
      }
      if (this.strings.delete(key)) removed = true
      if (removed) n++
    }
    return n
  }

  async sadd(key: string, member: string): Promise<number> {
    let set = this.presenceSets.get(key)
    if (!set) {
      set = new Set<string>()
      this.presenceSets.set(key, set)
    }
    const before = set.size
    set.add(member)
    return set.size > before ? 1 : 0
  }

  async srem(key: string, member: string): Promise<number> {
    const set = this.presenceSets.get(key)
    if (!set) return 0
    const ok = set.delete(member)
    if (set.size === 0) this.presenceSets.delete(key)
    return ok ? 1 : 0
  }

  async scard(key: string): Promise<number> {
    return this.presenceSets.get(key)?.size ?? 0
  }

  /** UserId có ít nhất một socket trong SET. */
  async getPresenceOnlineUserIds(): Promise<string[]> {
    const out: string[] = []
    for (const [key, set] of this.presenceSets) {
      if (set.size > 0 && key.startsWith(PRESENCE_SOCKETS_KEY_PREFIX)) {
        out.push(key.slice(PRESENCE_SOCKETS_KEY_PREFIX.length))
      }
    }
    return out
  }
}

const redisOptions = {
  maxRetriesPerRequest: null as null,
  enableOfflineQueue: false,
  /** Bắt buộc: chờ `connect()` rồi mới ping — nếu false, ping() lúc stream chưa sẵn sàng → "Stream isn't writeable" */
  lazyConnect: true,
  retryStrategy: () => null,
  /** Dev: tránh kết nối qua ::1 khi Redis chỉ bind IPv4 */
  ...(env.NODE_ENV === 'development' ? { family: 4 as const } : {}),
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Một lần tạo client + ping; thất bại thì dọn sạch. */
async function tryConnectRedisOnce(): Promise<boolean> {
  const clients: Redis[] = []
  try {
    cacheRedis = new Redis(env.REDIS_URL, redisOptions)
    pubClient = new Redis(env.REDIS_URL, redisOptions)
    subClient = pubClient.duplicate()
    clients.push(cacheRedis, pubClient, subClient)

    for (const c of clients) {
      attachQuietErrorHandler(c, 'client')
    }

    await Promise.all([cacheRedis.connect(), pubClient.connect(), subClient.connect()])
    await Promise.all([cacheRedis.ping(), pubClient.ping(), subClient.ping()])
    redisAdapterEnabled = true
    try {
      const legacy = await cacheRedis.keys(`${LEGACY_PRESENCE_COUNTER_PREFIX}*`)
      if (legacy.length > 0) {
        await cacheRedis.del(...legacy)
        if (env.NODE_ENV === 'development') {
          console.log(
            `[Redis] Đã xóa ${legacy.length} key presence cũ (${LEGACY_PRESENCE_COUNTER_PREFIX}*) — chuyển sang SET socket.id`
          )
        }
      }
    } catch (e) {
      console.warn('[Redis] Không xóa được key presence:user:* cũ', e)
    }
    return true
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[Redis] ping thất bại —', msg)
    }
    redisAdapterEnabled = false
    for (const c of clients) {
      try {
        c.disconnect()
      } catch {
        /* ignore */
      }
    }
    cacheRedis = null
    pubClient = null
    subClient = null
    return false
  }
}

/**
 * Kết nối Redis (adapter + typing/presence).
 * **Development:** thử lại vài lần (redis chạy song song với `npm run dev`).
 * Khi vẫn không ping được: bộ nhớ trong, không thoát process.
 */
export async function initRedis(): Promise<'redis' | 'memory'> {
  if (cacheRedis && redisAdapterEnabled) return 'redis'
  if (memoryCache) return 'memory'

  const maxAttempts = env.NODE_ENV === 'development' ? 24 : 1
  const delayMs = 200

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ok = await tryConnectRedisOnce()
    if (ok) return 'redis'
    if (attempt === 0 && env.NODE_ENV === 'development') {
      console.log('[Server] Chờ Redis (khởi động cùng lúc với redis-server trong npm run dev)…')
    }
    if (attempt < maxAttempts - 1) {
      await sleep(delayMs)
    }
  }

  if (env.NODE_ENV !== 'development') {
    throw new Error('Redis không khả dụng — kiểm tra REDIS_URL và Redis đang chạy.')
  }

  console.warn(
    '[Server] Không kết nối được Redis — chạy dev không Redis (Socket.IO không dùng redis-adapter; typing/presence trong RAM).'
  )
  memoryCache = new InMemoryRedisLike()
  return 'memory'
}

export function getRedisCache(): Redis | RedisCacheLike {
  if (memoryCache) return memoryCache
  if (!cacheRedis) {
    throw new Error('Redis chưa được khởi tạo — gọi initRedis() trước')
  }
  return cacheRedis
}

/**
 * Danh sách userId đang có ít nhất một socket (theo Redis/memory).
 * Dùng để đồng bộ client ngay sau khi connect — không chỉ dựa vào `presence:online` lúc người khác mới vào.
 */
export async function getPresenceOnlineUserIds(): Promise<string[]> {
  if (memoryCache) {
    return memoryCache.getPresenceOnlineUserIds()
  }
  if (!cacheRedis) {
    throw new Error('Redis chưa được khởi tạo — gọi initRedis() trước')
  }
  const keys = await cacheRedis.keys(`${PRESENCE_SOCKETS_KEY_PREFIX}*`)
  const out: string[] = []
  for (const key of keys) {
    const n = await cacheRedis.scard(key)
    if (n > 0) {
      out.push(key.slice(PRESENCE_SOCKETS_KEY_PREFIX.length))
    }
  }
  return out
}

export function getRedisAdapterClients(): { pubClient: Redis; subClient: Redis } {
  if (!redisAdapterEnabled || !pubClient || !subClient) {
    throw new Error('Redis adapter không khả dụng')
  }
  return { pubClient, subClient }
}

export function isRedisAdapterActive(): boolean {
  return redisAdapterEnabled && !!pubClient && !!subClient
}
