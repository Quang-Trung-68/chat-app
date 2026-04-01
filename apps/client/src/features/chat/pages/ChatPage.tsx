import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRoomsQuery } from '@/features/rooms/queries/rooms.queries'
import { ChatNavRail } from '../components/ChatNavRail'
import { ChatRoomList } from '../components/ChatRoomList'
import { ChatWelcome } from '../components/ChatWelcome'
import { ChatThread } from '../components/ChatThread'
import { ChatRightPanel } from '../components/ChatRightPanel'
import { useActiveConversationStore } from '../store/activeConversation.store'
import { useContactsPendingBadge } from '@/features/contacts/hooks/useContactsPendingBadge'
import { MobileBottomNav, mobileNavBottomPaddingClassName } from '@/shared/components/MobileBottomNav'
import { cn } from '@/lib/utils'

function useDesktopLgMatches() {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setMatches(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return matches
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const setActiveConversationId = useActiveConversationStore((s) => s.setActiveConversationId)

  useEffect(() => {
    setActiveConversationId(conversationId ?? null)
    return () => setActiveConversationId(null)
  }, [conversationId, setActiveConversationId])
  const { user, logout } = useAuth()
  const contactsPendingBadge = useContactsPendingBadge()
  const { data: rooms } = useRoomsQuery()
  const isLgUp = useDesktopLgMatches()
  const [rightOpen, setRightOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  )
  const [roomSearchOpen, setRoomSearchOpen] = useState(false)
  const scrollToMessageRef = useRef<(messageId: string) => Promise<void>>(async () => {})

  const room = rooms?.find((r) => r.id === conversationId)

  useEffect(() => {
    if (!isLgUp) setRightOpen(false)
  }, [isLgUp])

  useEffect(() => {
    setRoomSearchOpen(false)
    if (!isLgUp) setRightOpen(false)
  }, [conversationId, isLgUp])

  const toggleRoomSearch = useCallback(() => {
    setRoomSearchOpen((prev) => {
      const next = !prev
      if (next) setRightOpen(true)
      return next
    })
  }, [])

  const onScrollToMessageReady = useCallback((fn: (messageId: string) => Promise<void>) => {
    scrollToMessageRef.current = fn
  }, [])

  return (
    <div
      className={cn(
        'flex h-[100dvh] w-full flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top,0px)] text-foreground',
        mobileNavBottomPaddingClassName()
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1">
        <ChatNavRail
          className="hidden lg:flex"
          displayName={user?.displayName}
          username={user?.username}
          avatarUrl={user?.avatarUrl}
          onLogout={() => void logout()}
          contactsPendingBadge={contactsPendingBadge}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <ChatRoomList
            rooms={rooms}
            currentUserId={user?.id}
            className={conversationId ? 'hidden lg:flex' : undefined}
          />
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col',
              conversationId ? 'flex' : 'hidden lg:flex'
            )}
          >
            {conversationId ? (
              <ChatThread
                conversationId={conversationId}
                room={room}
                currentUserId={user?.id}
                onToggleRightPanel={() => setRightOpen((o) => !o)}
                rightPanelOpen={rightOpen}
                roomSearchOpen={roomSearchOpen}
                onToggleRoomSearch={toggleRoomSearch}
                onScrollToMessageReady={onScrollToMessageReady}
              />
            ) : (
              <ChatWelcome />
            )}
          </div>
          {conversationId && room && rightOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                aria-label="Đóng bảng thông tin"
                onClick={() => setRightOpen(false)}
              />
              <ChatRightPanel
                room={room}
                currentUserId={user?.id}
                onClose={() => setRightOpen(false)}
                onPinnedMessageClick={(messageId) => void scrollToMessageRef.current(messageId)}
                roomSearchOpen={roomSearchOpen}
                onCloseRoomSearch={() => setRoomSearchOpen(false)}
                onRoomSearchPickMessage={(messageId) => void scrollToMessageRef.current(messageId)}
              />
            </>
          ) : null}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
