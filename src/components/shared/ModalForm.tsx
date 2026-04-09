import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModalFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  isView?: boolean;
  children: React.ReactNode;
}

export function ModalForm({ open, onClose, title, description, onSubmit, submitLabel = "Save", isView, children }: ModalFormProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          {children}
        </div>
        {!isView && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSubmit}>{submitLabel}</Button>
          </DialogFooter>
        )}
        {isView && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
