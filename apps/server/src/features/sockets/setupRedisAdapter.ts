import { createAdapter } from '@socket.io/redis-adapter'
import type { Server } from 'socket.io'
import { getRedisAdapterClients } from '@/config/redis'

export function attachRedisAdapter(io: Server): void {
  const { pubClient, subClient } = getRedisAdapterClients()
  io.adapter(createAdapter(pubClient, subClient))
}
