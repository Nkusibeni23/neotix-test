"use client";

import { CheckIcon, Loader2Icon, PlayIcon, SendIcon, XIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";
import { useTransition } from "@/lib/queries";
import type { DatasetRequestDetail, RequestStatus } from "@/lib/types";

interface ActionStyle {
  label: string;
  done: string;
  icon: LucideIcon;
  variant: "default" | "outline" | "destructive";
  confirm?: string;
}

function actionFor(from: RequestStatus, to: RequestStatus): ActionStyle {
  switch (to) {
    case "in_progress":
      return from === "rejected"
        ? { label: "Start rework", done: "Rework started", icon: PlayIcon, variant: "default" }
        : { label: "Start work", done: "Work started", icon: PlayIcon, variant: "default" };
    case "delivered":
      return { label: "Mark as delivered", done: "Delivered to client", icon: SendIcon, variant: "default" };
    case "accepted":
      return { label: "Accept delivery", done: "Delivery accepted", icon: CheckIcon, variant: "default" };
    case "rejected":
      return {
        label: "Reject delivery",
        done: "Delivery rejected",
        icon: XIcon,
        variant: "destructive",
        confirm: "The request goes back to the operations team for rework.",
      };
    default:
      return { label: to, done: "Updated", icon: CheckIcon, variant: "outline" };
  }
}

/** One button per transition the API says this user may make. */
export function RequestActions({ request }: { request: DatasetRequestDetail }) {
  const transition = useTransition(request.id);
  const [confirming, setConfirming] = useState<RequestStatus | null>(null);
  const missing = request.episodes_requested - request.episodes_assigned;

  if (request.allowed_transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {request.status === "accepted"
          ? "This request is complete."
          : "Nothing for you to do right now."}
      </p>
    );
  }

  const run = (to: RequestStatus) =>
    transition.mutate(to, {
      onSuccess: () => {
        notify.success(actionFor(request.status, to).done);
        setConfirming(null);
      },
      onError: (e) => notify.error(e, "Could not update request"),
    });

  const confirmStyle = confirming && actionFor(request.status, confirming);

  return (
    <div className="flex flex-col gap-2">
      {request.allowed_transitions.map((to) => {
        const a = actionFor(request.status, to);
        const blocked = to === "delivered" && missing > 0;
        const pending = transition.isPending && transition.variables === to;
        return (
          <div key={to} className="space-y-1.5">
            <Button
              variant={a.variant}
              size="lg"
              className="w-full"
              disabled={blocked || transition.isPending}
              onClick={() => (a.confirm ? setConfirming(to) : run(to))}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <a.icon />}
              {a.label}
            </Button>
            {blocked && (
              <p className="text-center text-xs text-muted-foreground">
                Assign {missing} more episode{missing === 1 ? "" : "s"} to deliver.
              </p>
            )}
          </div>
        );
      })}

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="gap-6 p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{confirmStyle?.label}?</DialogTitle>
            <DialogDescription>{confirmStyle?.confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={transition.isPending}
              onClick={() => confirming && run(confirming)}
            >
              {transition.isPending && <Loader2Icon className="animate-spin" />}
              {confirmStyle?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
