import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type PromoteAdminConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: () => void
  isPending?: boolean
}

export function PromoteAdminConfirmDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isPending,
}: PromoteAdminConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Phong quản trị viên?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{memberName}</span> sẽ trở thành quản trị viên nhóm.
            Bạn sẽ trở thành thành viên thường.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm()}>
            {isPending ? 'Đang xử lý…' : 'Phong quản trị viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
