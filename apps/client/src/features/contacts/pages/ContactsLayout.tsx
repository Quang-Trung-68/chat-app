import { Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ChatNavRail } from '@/features/chat/components/ChatNavRail'
import { ChatGlobalSearchToolbarStandalone } from '@/features/chat/components/ChatGlobalSearchToolbar'
import { ContactsSubNav } from '@/features/contacts/components/ContactsSubNav'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'
import { MobileBottomNav, mobileNavBottomPaddingClassName } from '@/shared/components/MobileBottomNav'
import { cn } from '@/lib/utils'

export function ContactsLayout() {
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-[42%] min-h-0 w-full shrink-0 flex-col border-b border-border/80 bg-white md:h-full md:max-h-none md:max-w-[300px] md:border-b-0 md:border-r">
          <ChatGlobalSearchToolbarStandalone />
          <ContactsSubNav />
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#f4f5f7]">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
