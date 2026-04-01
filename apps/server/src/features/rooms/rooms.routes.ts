import { Router } from 'express'
import { authenticate } from '@/middlewares/authenticate'
import { requireEmailVerified } from '@/middlewares/requireEmailVerified'
import * as controller from './rooms.controller'
import {
  validate,
  createGroupSchema,
  pinMessageSchema,
  transferGroupOwnerSchema,
} from './rooms.validation'

const router = Router()

router.use(authenticate)
router.use(requireEmailVerified)

router.get('/', controller.listRooms)
router.post('/', validate(createGroupSchema), controller.createGroup)
router.get('/:id/pins', controller.listPins)
router.post('/:id/pins', validate(pinMessageSchema), controller.pinMessage)
router.delete('/:id/pins/:messageId', controller.unpinMessage)
router.patch('/:id/read', controller.markRoomRead)
router.post(
  '/:id/owner',
  validate(transferGroupOwnerSchema),
  controller.transferGroupOwner
)
router.delete('/:id', controller.disbandGroup)

export default router
