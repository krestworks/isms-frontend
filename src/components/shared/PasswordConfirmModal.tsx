import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/authService";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Re-authentication gate for sensitive actions (e.g. business account
 * activate/suspend/deactivate) — requires the acting user to re-enter their
 * own current password, verified server-side (POST /auth/password/verify),
 * before `onConfirm` fires. Unlike DangerConfirmModal's random-phrase pattern
 * (anti-misclick friction only), this proves it's really the account owner
 * at the keyboard, not just someone who inherited an unlocked session.
 */
export function PasswordConfirmModal({
  open, title, description, confirmLabel = "Confirm", variant = "default", onConfirm, onCancel,
}: Props) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setPassword(""); setError(null); setVerifying(false); }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setVerifying(true);
    setError(null);
    try {
      await authService.verifyPassword(password);
      onConfirm();
    } catch (e: any) {
      setError(e?.message || "Incorrect password");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="password-confirm-input" className="text-xs text-muted-foreground">
            Enter your account password to confirm
          </Label>
          <Input
            id="password-confirm-input"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}

          <AlertDialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={verifying}>Cancel</Button>
            <Button
              type="submit"
              disabled={!password || verifying}
              variant={variant === "destructive" ? "destructive" : "default"}
            >
              {verifying ? "Verifying..." : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
