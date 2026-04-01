import type { IceServer } from '../api/getTurnCredentials'

export function createPeerConnection(iceServers: IceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers })
}
