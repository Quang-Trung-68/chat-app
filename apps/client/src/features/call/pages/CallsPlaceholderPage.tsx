import { Phone } from 'lucide-react'
import { AppShellLayout } from '@/shared/layouts/AppShellLayout'

export function CallsPlaceholderPage() {
  return (
    <AppShellLayout>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0068ff]/12 text-[#0068ff]">
          <Phone className="h-10 w-10" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Cuộc gọi</h1>
          <p className="text-sm text-muted-foreground">
            Lịch sử cuộc gọi sẽ hiển thị tại đây. Hiện bạn có thể gọi thoại trực tiếp từ màn hình chat 1–1 (biểu tượng điện thoại trên thanh tiêu đề).
          </p>
        </div>
      </div>
    </AppShellLayout>
  )
}
