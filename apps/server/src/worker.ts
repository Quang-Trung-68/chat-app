import './config/env'

import { initRedis } from './config/redis'
import { startNotifyMessageWorker } from './features/push/notifyMessage.worker'

void (async () => {
  try {
    await initRedis()
  } catch (e) {
    console.error('[Worker] Redis bắt buộc — kiểm tra REDIS_URL.', e)
    process.exit(1)
  }
  startNotifyMessageWorker()
  console.log('[Worker] notify-message worker đã chạy')
})()
