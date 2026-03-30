import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import * as controller from './rooms.controller'
import { validate, createGroupSchema } from './rooms.validation'

const router = Router()

router.use(authenticate)

router.get('/', controller.listRooms)
router.post('/', validate(createGroupSchema), controller.createGroup)
router.patch('/:id/read', controller.markRoomRead)

export default router
