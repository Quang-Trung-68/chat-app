import type { IceServer } from '../api/getTurnCredentials'

/** Trình duyệt cảnh báo khi ≥5 STUN/TURN — Metered trả nhiều entry; giữ tối đa 4. */
export function trimIceServers(servers: IceServer[] | undefined, max = 4): IceServer[] {
  if (!servers?.length) return []
  return servers.slice(0, max)
}
