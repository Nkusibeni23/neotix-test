const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const relativeFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Plain dates ("2026-10-12") are parsed as local midnight so they never shift a day.
const parse = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

export const formatDate = (iso: string) => dateFmt.format(parse(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(parse(iso));

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** Whole days from today until a date; negative when it has passed. */
export function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parse(isoDate).getTime() - today.getTime()) / 86_400_000);
}

export function formatDue(isoDate: string) {
  const days = daysUntil(isoDate);
  return relativeFmt.format(days, "day");
}
