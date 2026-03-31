export const roomsKeys = {
  all: ['rooms'] as const,
  pins: (conversationId: string) => ['roomPins', conversationId] as const,
}
