import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { validateBody } from '@/features/messages/messages.validation'
import * as controller from './push.controller'
import { pushSubscribeBodySchema, pushUnsubscribeBodySchema } from './push.validation'

const router = Router()

router.get('/vapid-public-key', controller.getVapidPublicKey)

router.post('/subscribe', authenticate, validateBody(pushSubscribeBodySchema), controller.subscribe)
router.post('/unsubscribe', authenticate, validateBody(pushUnsubscribeBodySchema), controller.unsubscribe)

export default router
