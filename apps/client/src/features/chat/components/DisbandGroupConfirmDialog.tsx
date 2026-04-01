import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type DisbandGroupConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

export function DisbandGroupConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DisbandGroupConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Giải tán nhóm?</DialogTitle>
          <DialogDescription>
            Mọi thành viên sẽ không còn thấy hội thoại này. Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm()}
          >
            {isPending ? 'Đang xử lý…' : 'Giải tán nhóm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
