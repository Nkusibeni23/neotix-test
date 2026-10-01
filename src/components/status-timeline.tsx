import { cn } from "cn";

import { STATUS_DOT, STATUS_LABELS } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { StatusEvent } from "@/lib/types";


/** Audit trail, newest first: who changed the status, and when. */
export function StatusTimeline({ events }: { events: StatusEvent[] }) {
  const newestFirst = [...events].reverse();
  return (
    <ol className="space-y-0">
      {newestFirst.map((e, i) => (
        <li key={`${e.changed_at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          {i < newestFirst.length - 1 && (
            <span className="absolute top-4 left-[5px] h-full w-px bg-border" aria-hidden />
          )}
          <span
            className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-card", STATUS_DOT[e.to_status])}
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm">
              <span className="font-medium">{STATUS_LABELS[e.to_status]}</span>
              <span className="text-muted-foreground"> by {e.changed_by.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(e.changed_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
