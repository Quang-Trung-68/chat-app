import { cn } from '@/lib/utils'

type OnlinePresenceDotProps = {
  show: boolean
  className?: string
}

/** Chấm xanh góc dưới phải avatar — đồng bộ với presence socket. */
export function OnlinePresenceDot({ show, className }: OnlinePresenceDotProps) {
  if (!show) return null
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-0 right-0 z-1 box-border h-[11px] w-[11px] rounded-full border-2 border-white bg-emerald-500 shadow-sm',
        className
      )}
      aria-hidden
      title="Đang hoạt động"
    />
  )
}
