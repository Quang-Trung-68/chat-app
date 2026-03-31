/** Giới hạn tìm kiếm tin nhắn (client + server). */
export const SEARCH_MESSAGES = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 200,
  DEFAULT_LIMIT: 15,
  MAX_LIMIT: 20,
  /** Debounce ô tìm (ms) */
  DEBOUNCE_MS: 300,
} as const
