import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import type { Quality, RequestStatus } from "@/lib/types";

// Colours come from theme tokens in globals.css, so light/dark mode is handled there.
const STATUS: Record<RequestStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-status-submitted/15 text-status-submitted" },
  in_progress: { label: "In progress", className: "bg-status-in-progress/15 text-status-in-progress" },
  delivered: { label: "Delivered", className: "bg-status-delivered/15 text-status-delivered" },
  accepted: { label: "Accepted", className: "bg-status-accepted/15 text-status-accepted" },
  rejected: { label: "Rejected", className: "bg-status-rejected/15 text-status-rejected" },
};

const QUALITY: Record<Quality, string> = {
  good: "bg-quality-good/15 text-quality-good",
  usable: "bg-quality-usable/15 text-quality-usable",
  bad: "bg-quality-bad/15 text-quality-bad",
};

// Full class names (not built from strings) so Tailwind can find them.
export const STATUS_DOT: Record<RequestStatus, string> = {
  submitted: "bg-status-submitted",
  in_progress: "bg-status-in-progress",
  delivered: "bg-status-delivered",
  accepted: "bg-status-accepted",
  rejected: "bg-status-rejected",
};

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS).map(([key, value]) => [key, value.label]),
) as Record<RequestStatus, string>;

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { label, className: color } = STATUS[status];
  return <Badge className={cn(color, className)}>{label}</Badge>;
}

export function QualityBadge({ quality, className }: { quality: Quality; className?: string }) {
  return <Badge className={cn("capitalize", QUALITY[quality], className)}>{quality}</Badge>;
}
