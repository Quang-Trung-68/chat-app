import {
  MessageCircle,
  Phone,
  Users,
  Cloud,
  Briefcase,
  LogOut,
  Settings,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: MessageCircle, label: 'Tin nhắn', active: true },
  { icon: Phone, label: 'Cuộc gọi', active: false },
  { icon: Users, label: 'Danh bạ', active: false },
  { icon: Cloud, label: 'Cloud', active: false },
  { icon: Briefcase, label: 'Công việc', active: false },
] as const

type ChatNavRailProps = {
  displayName?: string | null
  avatarUrl?: string | null
  onLogout?: () => void
}

export function ChatNavRail({ displayName, avatarUrl, onLogout }: ChatNavRailProps) {
  const initial = (displayName ?? '?').slice(0, 1).toUpperCase()

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'flex w-[60px] shrink-0 flex-col items-center gap-2 py-3 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]',
          'bg-[#005ae0] text-white'
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 border border-white/20">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-white/20 text-sm font-medium text-white">{initial}</AvatarFallback>
          </Avatar>
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#005ae0] bg-emerald-500"
            aria-hidden
            title="Trực tuyến"
          />
        </div>

        <div className="mt-2 flex flex-1 flex-col gap-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!active}
                  className={cn(
                    'text-white hover:bg-white/15 hover:text-white',
                    active && 'bg-white/20'
                  )}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {active ? label : `${label} (sắp có)`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1">
          {onLogout ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/15"
                  aria-label="Đăng xuất"
                  onClick={onLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Đăng xuất</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                className="text-white hover:bg-white/15"
                aria-label="Cài đặt"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Cài đặt (sắp có)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
