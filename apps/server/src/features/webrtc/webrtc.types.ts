export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface TurnCredentialsResponse {
  iceServers: IceServer[]
}
