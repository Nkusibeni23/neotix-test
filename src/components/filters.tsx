"use client";

import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** White panel that groups a row of filters; wraps onto several lines on small screens. */
export function FilterBar({
  children,
  onClear,
  canClear,
  summary,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  canClear?: boolean;
  summary?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {(summary || onClear) && (
        <div className="flex min-h-8 items-center justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">{summary}</span>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} disabled={!canClear}>
              <XIcon />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

const ALL = "__all__";

/** Select with an "All" option. `value` is undefined when nothing is chosen. */
export function OptionSelect({
  value,
  onChange,
  options,
  allLabel = "All",
  className,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  const items = [{ value: ALL, label: allLabel }, ...options];
  return (
    <Select
      items={items}
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL || v === null ? undefined : String(v))}
    >
      <SelectTrigger className={cn("w-full sm:w-48", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Multi-select chips, e.g. quality: [✓ Good] [✓ Usable] [ Bad ]. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; dotClass?: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "border-primary/40 bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {on ? (
              <CheckIcon className="size-3.5" />
            ) : (
              o.dotClass && <span className={cn("size-2 rounded-full", o.dotClass)} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pill tabs with counts, e.g. All 12 · Submitted 3 · Delivered 2. Scrolls sideways on phones. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-xl border bg-card p-1" role="tablist">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    active ? "bg-primary-foreground/20" : "bg-muted",
                  )}
                >
                  {o.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
