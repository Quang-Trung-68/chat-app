import { useCallback, useEffect, useRef, useState } from 'react'
import { ALLOWED_REACTION_EMOJIS, EMOJI_ANGRY_FACE } from '@chat-app/shared-constants'
import { Plus, ThumbsUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { postMessageReaction } from '@/features/messages/api/messages.api'
import { applyReactionPatch } from '@/features/messages/reactions/applyReactionPatch'
import type { MessageItemDto } from '@/features/messages/types/message.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Quick reaction bar emojis */
export const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Huhu' },
  { emoji: EMOJI_ANGRY_FACE, label: 'Angry' },
] as const

export function useReactionApply(message: MessageItemDto, conversationId: string) {
  const queryClient = useQueryClient()
  return useCallback(
    async (emoji: string) => {
      const prev: Pick<MessageItemDto, 'reactionSummary' | 'myReactionEmoji'> = {
        reactionSummary: message.reactionSummary ?? [],
        myReactionEmoji: message.myReactionEmoji ?? null,
      }
      try {
        const data = await postMessageReaction(message.id, emoji)
        applyReactionPatch(queryClient, conversationId, message.id, {
          reactionSummary: data.reactionSummary,
          myReactionEmoji: data.myReactionEmoji,
        })
      } catch {
        applyReactionPatch(queryClient, conversationId, message.id, prev)
      }
    },
    [conversationId, message.id, message.myReactionEmoji, message.reactionSummary, queryClient]
  )
}

function iconCircle(mine: boolean) {
  return cn(
    'h-6 w-6 min-h-6 min-w-6 shrink-0 rounded-full border shadow-sm transition-colors',
    '[&_svg]:h-3 [&_svg]:w-3',
    mine
      ? [
        'border-zinc-200/70 bg-white/95 text-slate-700',
        'hover:border-slate-300 hover:bg-white hover:text-slate-900',
      ]
      : [
        'border-zinc-200 bg-white/95 text-slate-600',
        'hover:bg-slate-50 hover:text-slate-900',
      ]
  )
}

type MessageReactionHoverLayerProps = {
  message: MessageItemDto
  conversationId: string
  mine: boolean
}

/** Cùng kích thước ô vuông cho pill tóm tắt và nút trigger (Zalo-style). */
const REACTION_CHIP = 'flex shrink-0 items-center justify-center rounded-xl border shadow-sm'

/**
 * Absolute layer at bottom-right of bubble:
 *   [pill — shown when hasReactions] [trigger button]
 *
 * Trigger visibility:
 *   — Luôn hiện khi có reaction từ người khác và mình chưa react (thumbs mặc định).
 *   — Chỉ hiện khi hover nếu chưa có reaction nào, hoặc mình đã react (hiện emoji của mình).
 */
export function MessageReactionHoverLayer({
  message,
  conversationId,
  mine,
}: MessageReactionHoverLayerProps) {
  const apply = useReactionApply(message, conversationId)
  const myEmoji = message.myReactionEmoji ?? null
  const summary = message.reactionSummary ?? []
  const hasReactions = summary.length > 0
  const totalReactions = summary.reduce((acc, s) => acc + s.count, 0)
  const primaryEmoji = summary[0]?.emoji ?? ''

  const [pickerOpen, setPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  /* Đóng khi click ngoài vùng trigger + popup; defer để click mở lưới không bị coi là “ngoài”. */
  useEffect(() => {
    if (!pickerOpen) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setExpanded(false)
      }
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [pickerOpen])

  const onPick = useCallback(
    async (emoji: string) => {
      await apply(emoji)
      setPickerOpen(false)
      setExpanded(false)
    },
    [apply]
  )

  const triggerAlwaysVisible = hasReactions && !myEmoji

  return (
    <div className="pointer-events-auto absolute bottom-0 right-0 z-30 flex translate-y-1 flex-row items-center gap-0.5">
      {/* Reaction pill — h-7 w-7 khớp nút trigger */}
      {hasReactions ? (
        <div
          className={cn(
            REACTION_CHIP,
            'flex-row items-center justify-center gap-1 overflow-hidden p-1 leading-none',
            myEmoji ? 'border-blue-200 bg-blue-50' : 'border-zinc-200 bg-white'
          )}
        >
          <span className="select-none text-[14px] leading-none" aria-hidden>
            {primaryEmoji}
          </span>
          {totalReactions > 1 ? (
            <span className="text-[12px] font-medium tabular-nums leading-none text-foreground">
              {totalReactions}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Trigger button — visibility per state rules */}
      <div
        ref={wrapRef}
        className={cn(
          'relative shrink-0 transition-opacity duration-150',
          triggerAlwaysVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconCircle(mine)}
          aria-label="Reaction"
          title="Reaction"
          onClick={() => {
            setPickerOpen((prev) => {
              const next = !prev
              if (next) setExpanded(false)
              return next
            })
          }}
        >
          {myEmoji ? (
            <span className="text-[14px] leading-none">{myEmoji}</span>
          ) : (
            <ThumbsUp className="h-3 w-3 text-zinc-400" strokeWidth={2.25} />
          )}
        </Button>

        {pickerOpen && !expanded ? (
          <div
            className={cn(
              'pointer-events-auto absolute bottom-full z-50 mb-1 flex flex-row items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 py-0.5 shadow-lg',
              mine ? 'right-0' : 'left-0'
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {QUICK_REACTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                title={item.label}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[18px] leading-none transition-transform duration-150 hover:scale-125 hover:bg-zinc-100"
                onClick={() => void onPick(item.emoji)}
              >
                {item.emoji}
              </button>
            ))}
            <button
              type="button"
              title="Thêm emoji"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-transform duration-150 hover:scale-110 hover:bg-zinc-100"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        {pickerOpen && expanded ? (
          <div
            className={cn(
              'pointer-events-auto absolute bottom-full z-50 mb-1 max-h-[min(50vh,280px)] w-[min(90vw,220px)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl',
              mine ? 'right-0' : 'left-0'
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="grid max-h-[min(44vh,260px)] grid-cols-5 gap-px overflow-y-auto p-1.5">
              {ALLOWED_REACTION_EMOJIS.map((e, idx) => (
                <button
                  key={`${idx}-${e}`}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px] leading-none transition-transform duration-150 hover:scale-110 hover:bg-zinc-100"
                  onClick={() => void onPick(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
