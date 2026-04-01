import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'
import { MobileBottomNav, mobileNavBottomPaddingClassName } from '@/shared/components/MobileBottomNav'
import { cn } from '@/lib/utils'

type AppShellLayoutProps = {
  children: ReactNode
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const { user, logout } = useAuth()
  const contactsPendingBadge = useContactsPendingBadge()

  return (
    <div
      className={cn(
        'flex h-[100dvh] w-full overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] text-foreground',
        mobileNavBottomPaddingClassName()
      )}
    >
      <ChatNavRail
        className="hidden lg:flex"
        displayName={user?.displayName}
        username={user?.username}
        avatarUrl={user?.avatarUrl}
        onLogout={() => void logout()}
        contactsPendingBadge={contactsPendingBadge}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f5f7]">{children}</div>
      <MobileBottomNav />
    </div>
  )
}
