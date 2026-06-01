import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModalFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  submitVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  isView?: boolean;
  children: React.ReactNode;
}

export function ModalForm({
  open, onClose, title, description, onSubmit,
  submitLabel = "Save", submitVariant = "default", isView, children,
}: ModalFormProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </DialogHeader>

        <div className="px-6 py-2 overflow-y-auto flex-1">
          {children}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 border-t shrink-0">
          {!isView ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" variant={submitVariant} onClick={onSubmit}>{submitLabel}</Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
