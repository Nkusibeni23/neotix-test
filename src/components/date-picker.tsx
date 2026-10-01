"use client";

import { CalendarIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";

// The API speaks plain "YYYY-MM-DD" dates. Convert in local time so a picked day never
// shifts by one because of the user's timezone.
export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const triggerClass =
  "h-10 w-full justify-start gap-2 px-3 font-normal data-[empty=true]:text-muted-foreground";

/** Single date. `value` and `onChange` use "YYYY-MM-DD" strings. */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  invalid,
  className,
}: {
  id?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  min?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromISODate(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            data-empty={!value}
            aria-invalid={invalid}
            className={cn(triggerClass, className)}
          >
            <CalendarIcon className="text-muted-foreground" />
            {value ? formatDate(value) : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-1" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={min ? { before: fromISODate(min) } : undefined}
          onSelect={(d) => {
            onChange(d ? toISODate(d) : undefined);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/** Start/end range in one popover; two months side by side on wider screens. */
export function DateRangePicker({
  value,
  onChange,
  max,
  className,
}: {
  value: { start: string; end: string };
  onChange: (value: { start: string; end: string }) => void;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Held locally until both ends are picked, so a half-chosen range never hits the API.
  const [draft, setDraft] = useState<DateRange | undefined>();
  const selected = draft ?? { from: fromISODate(value.start), to: fromISODate(value.end) };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setDraft(undefined);
      }}
    >
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className={cn(triggerClass, "sm:w-72", className)}>
            <CalendarIcon className="text-muted-foreground" />
            {formatDate(value.start)} – {formatDate(value.end)}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-1" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          className="[&_.rdp-months]:flex-col sm:[&_.rdp-months]:flex-row"
          selected={selected}
          defaultMonth={selected.from}
          disabled={max ? { after: fromISODate(max) } : undefined}
          // First click sets the start, second click the end (same day twice = one day).
          onSelect={(_, day) => {
            if (!draft?.from || day < draft.from) {
              setDraft({ from: day, to: undefined });
              return;
            }
            onChange({ start: toISODate(draft.from), end: toISODate(day) });
            setOpen(false);
            setDraft(undefined);
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t px-2 pt-2 pb-1">
          <span className="text-xs text-muted-foreground">
            {draft?.from ? "Now pick the end date" : "Pick a start date, then an end date"}
          </span>
          {draft && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(undefined)}>
              <XIcon />
              Reset
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
