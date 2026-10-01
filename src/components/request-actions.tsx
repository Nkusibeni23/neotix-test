"use client";

import { CheckIcon, Loader2Icon, PlayIcon, SendIcon, XIcon, type LucideIcon } from "lucide-react";

import { useConfirm, type ConfirmOptions } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { useTransition } from "@/lib/queries";
import type { DatasetRequestDetail, RequestStatus } from "@/lib/types";

interface Action {
  label: string;
  done: string;
  icon: LucideIcon;
  variant: "default" | "destructive";
  /** Set for steps that cannot be undone by the person taking them. */
  confirm?: Omit<ConfirmOptions, "onConfirm">;
}

function actionFor(request: DatasetRequestDetail, to: RequestStatus): Action {
  const n = request.episodes_assigned;
  switch (to) {
    case "in_progress":
      return request.status === "rejected"
        ? { label: "Start rework", done: "Rework started", icon: PlayIcon, variant: "default" }
        : { label: "Start work", done: "Work started", icon: PlayIcon, variant: "default" };
    case "delivered":
      return {
        label: "Mark as delivered",
        done: "Delivered to client",
        icon: SendIcon,
        variant: "default",
        confirm: {
          title: "Deliver to the client?",
          description: `The client will review ${n} episode${n === 1 ? "" : "s"}. Episodes can't be changed while they review.`,
          confirmLabel: "Deliver",
        },
      };
    case "accepted":
      return {
        label: "Accept delivery",
        done: "Delivery accepted",
        icon: CheckIcon,
        variant: "default",
        confirm: {
          title: "Accept this delivery?",
          description: "This closes the request. It can't be reopened.",
          confirmLabel: "Accept delivery",
        },
      };
    case "rejected":
      return {
        label: "Reject delivery",
        done: "Delivery rejected",
        icon: XIcon,
        variant: "destructive",
        confirm: {
          title: "Reject this delivery?",
          description: "The request goes back to the operations team for rework.",
          confirmLabel: "Reject delivery",
          tone: "destructive",
        },
      };
    default:
      return { label: to, done: "Updated", icon: CheckIcon, variant: "default" };
  }
}

/** One button per transition the API says this user may make. */
export function RequestActions({ request }: { request: DatasetRequestDetail }) {
  const transition = useTransition(request.id);
  const confirm = useConfirm();
  const missing = request.episodes_requested - request.episodes_assigned;

  if (request.allowed_transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {request.status === "accepted" ? "This request is complete." : "Nothing for you to do right now."}
      </p>
    );
  }

  // Rejects on failure so the confirm dialog stays open.
  const run = (to: RequestStatus, action: Action) =>
    transition.mutateAsync(to).then(
      () => notify.success(action.done),
      (e) => {
        notify.error(e, "Could not update request");
        throw e;
      },
    );

  return (
    <div className="flex flex-col gap-2">
      {request.allowed_transitions.map((to) => {
        const action = actionFor(request, to);
        const blocked = to === "delivered" && missing > 0;
        const pending = transition.isPending && transition.variables === to;
        return (
          <div key={to} className="space-y-1.5">
            <Button
              variant={action.variant}
              size="lg"
              className="w-full"
              disabled={blocked || transition.isPending}
              onClick={() =>
                action.confirm
                  ? confirm({ ...action.confirm, onConfirm: () => run(to, action) })
                  : run(to, action).catch(() => {})
              }
            >
              {pending ? <Loader2Icon className="animate-spin" /> : <action.icon />}
              {action.label}
            </Button>
            {blocked && (
              <p className="text-center text-xs text-muted-foreground">
                Assign {missing} more episode{missing === 1 ? "" : "s"} to deliver.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
