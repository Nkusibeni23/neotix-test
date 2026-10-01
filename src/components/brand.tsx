import { DatabaseIcon } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <DatabaseIcon className="size-4" />
      </span>
      {!compact && (
        <span className="font-heading text-[15px] font-semibold tracking-tight">Request Desk</span>
      )}
    </span>
  );
}
