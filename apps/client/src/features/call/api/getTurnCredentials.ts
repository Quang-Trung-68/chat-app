import { api } from '@/services/api'

export type IceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

export async function getTurnCredentials(): Promise<IceServer[]> {
  const { data } = await api.get<{ iceServers: IceServer[] }>('/webrtc/turn-credentials')
  return data.iceServers
}
