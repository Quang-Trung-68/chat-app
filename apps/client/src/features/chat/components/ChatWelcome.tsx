import { MessageCircle } from 'lucide-react'

export function ChatWelcome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#ebf0f5] px-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#0068ff]/10 text-[#0068ff]">
        <MessageCircle className="h-10 w-10" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">
        Chào mừng đến với <span className="text-[#0068ff]">Chat App</span>
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Chọn một hội thoại bên trái để bắt đầu nhắn tin.
      </p>
    </div>
  )
}
