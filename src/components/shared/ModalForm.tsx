import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative bg-background border shadow-lg rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3 shrink-0">
          <div className="space-y-1">
            <h2 id="modal-title" className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ml-4 mt-0.5"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-2 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 shrink-0">
          {!isView ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" variant={submitVariant} onClick={onSubmit}>{submitLabel}</Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
