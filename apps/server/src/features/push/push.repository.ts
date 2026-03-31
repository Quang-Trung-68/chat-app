import { prisma } from '@/config/prisma'

export const pushRepository = {
  upsertSubscription(input: {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    userAgent: string | null
  }) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
      update: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
    })
  },

  deleteByEndpointAndUser(endpoint: string, userId: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    })
  },

  listSubscriptionsByUserId(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
    })
  },

  deleteByEndpoint(endpoint: string) {
    return prisma.pushSubscription.deleteMany({ where: { endpoint } })
  },
}
