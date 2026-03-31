import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pinRoomMessage, unpinRoomMessage, fetchRoomPins } from '../api/roomPins.api'
import { roomsKeys } from '../rooms.keys'

export function useRoomPinsQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? roomsKeys.pins(conversationId) : ['roomPins', 'none'],
    queryFn: () => fetchRoomPins(conversationId!),
    enabled: Boolean(conversationId),
  })
}

export function useRoomPinMutations(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  const key = conversationId ? roomsKeys.pins(conversationId) : null

  const invalidate = () => {
    if (conversationId && key) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const pin = useMutation({
    mutationFn: (messageId: string) => pinRoomMessage(conversationId!, messageId),
    onSuccess: invalidate,
  })

  const unpin = useMutation({
    mutationFn: (messageId: string) => unpinRoomMessage(conversationId!, messageId),
    onSuccess: invalidate,
  })

  return { pin, unpin }
}
