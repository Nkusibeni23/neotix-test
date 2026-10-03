import { cn } from "cn";

/** "12 / 20" with a bar; turns green when the request has enough episodes to deliver. */
export function EpisodeProgress({
  assigned,
  requested,
  className,
}: {
  assigned: number;
  requested: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((assigned / requested) * 100));
  const complete = assigned >= requested;
  return (
    <div className={cn("flex min-w-28 flex-col gap-1.5", className)}>
      {/* Count and percentage sit together so the eye doesn't travel across the bar. */}
      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-medium tabular-nums">
          {assigned} <span className="text-muted-foreground">/ {requested}</span>
        </span>
        <span className="text-muted-foreground tabular-nums">· {pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={assigned}
        aria-valuemin={0}
        aria-valuemax={requested}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            complete ? "bg-status-accepted" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
