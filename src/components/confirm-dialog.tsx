"use client";

import { Loader2Icon } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" for actions that remove access or undo work. */
  tone?: "default" | "destructive";
  /**
   * Runs when the user confirms. While its promise is pending the dialog shows a spinner;
   * it closes on success and stays open on failure (the caller shows the error).
   */
  onConfirm: () => Promise<unknown> | void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => void) | null>(null);

/** `const confirm = useConfirm(); confirm({ title, onConfirm })` from any component. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

/** Renders one shared confirmation dialog for the whole app. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    setOpen(true);
  }, []);

  const run = async () => {
    if (!options) return;
    setPending(true);
    try {
      await options.onConfirm();
      setOpen(false);
    } catch {
      // Keep the dialog open so the user can retry or cancel; the caller reported the error.
    } finally {
      setPending(false);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="gap-6 p-6 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg">{options?.title}</DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={options?.tone === "destructive" ? "destructive" : "default"}
              disabled={pending}
              onClick={run}
              autoFocus
            >
              {pending && <Loader2Icon className="animate-spin" />}
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
