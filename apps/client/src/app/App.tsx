import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AuthBootstrap } from './AuthBootstrap'
import { SocketBootstrap } from './SocketBootstrap'
import { DocumentTitleSync } from '@/features/app/DocumentTitleSync'
import { PushNotificationBanner } from '@/features/push/components/PushNotificationBanner'
import { AppRoutes } from '@/routes'

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthBootstrap />
        <DocumentTitleSync />
        <SocketBootstrap />
        <PushNotificationBanner />
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryProvider>
  )
}
