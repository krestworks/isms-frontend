import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function randomPhrase(): string {
  // Not a security boundary (the acting user already holds the permission for
  // this action) — just a deliberate-friction step against misclicks, so a
  // client-side random code is sufficient.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Same shape as ConfirmDialog, but requires the user to type a fresh
 * system-generated code before the destructive action can proceed. Used for
 * every Tier-1 (two-person-approval) action and can be reused for Tier-2
 * (single-user) deletions that still warrant deliberate friction.
 */
export function DangerConfirmModal({
  open, title, description, confirmLabel = "Confirm", variant = "destructive", loading, onConfirm, onCancel,
}: Props) {
  const [phrase, setPhrase] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) { setPhrase(randomPhrase()); setTyped(""); }
  }, [open]);

  const matches = typed.trim().toUpperCase() === phrase;

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Type <span className="font-mono font-bold text-foreground tracking-widest">{phrase}</span> to confirm
          </Label>
          <Input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={phrase}
            className="font-mono tracking-widest"
            autoComplete="off"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!matches || loading}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {loading ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
