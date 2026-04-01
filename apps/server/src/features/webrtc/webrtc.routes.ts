import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './webrtc.controller'

const router = Router()

router.get('/turn-credentials', authenticate, controller.getTurnCredentialsHandler)

export default router
