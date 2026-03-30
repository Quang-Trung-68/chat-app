import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { roomsKeys } from '../rooms.keys'

/** Response GET /api/rooms — cùng shape server `RoomListItemDto[]`. */
export function useRoomsQuery() {
  return useQuery({
    queryKey: roomsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: unknown }>('/rooms')
      return data.data
    },
  })
}
