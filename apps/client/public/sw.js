/* global self, clients */
self.addEventListener('push', (event) => {
  let payload = { title: 'Tin nhắn mới', body: '', url: '/' }
  try {
    const text = event.data?.text()
    if (text) {
      const parsed = JSON.parse(text)
      payload = { ...payload, ...parsed }
    }
  } catch {
    /* ignore */
  }
  const url = typeof payload.url === 'string' ? payload.url : '/'
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Tin nhắn mới', {
      body: payload.body || '',
      data: { url },
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: payload.conversationId ? `chat-${payload.conversationId}` : 'chat',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const raw = event.notification.data
  const url = typeof raw === 'object' && raw && 'url' in raw && typeof raw.url === 'string' ? raw.url : '/'
  const origin = self.location.origin
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (!client.url.startsWith(origin)) continue
        if ('navigate' in client && typeof client.navigate === 'function') {
          return client.navigate(url).then(() => client.focus())
        }
        return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
