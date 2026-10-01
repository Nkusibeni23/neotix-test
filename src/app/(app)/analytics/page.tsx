"use client";

import { BarChart3Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorAlert } from "@/components/error-alert";
import { FilterBar, FilterField, SegmentedTabs } from "@/components/filters";
import { PageHeader } from "@/components/page-header";
import { STATUS_DOT, STATUS_LABELS } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useAnalytics } from "@/lib/queries";
import type { RequestStatus } from "@/lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

type Preset = "7" | "30" | "90" | "custom";
const STATUSES: RequestStatus[] = ["submitted", "in_progress", "delivered", "accepted", "rejected"];

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("90");
  const [custom, setCustom] = useState({ start: daysAgo(29), end: iso(new Date()) });
  const range =
    preset === "custom" ? custom : { start: daysAgo(Number(preset) - 1), end: iso(new Date()) };
  const analytics = useAnalytics(range.start, range.end);
  const data = analytics.data;

  // Pivot rows of (day, robot, count) into one row per day with a column per robot.
  const { robots, days } = useMemo(() => {
    const robots = [...new Set(data?.episodes_per_day.map((r) => r.robot_id))].sort();
    const byDay = new Map<string, Record<string, number>>();
    for (const r of data?.episodes_per_day ?? []) {
      const row = byDay.get(r.day) ?? {};
      row[r.robot_id] = r.episodes;
      byDay.set(r.day, row);
    }
    const days = [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
    return { robots, days };
  }, [data]);

  const maxGood = Math.max(1, ...(data?.top_tasks.map((t) => t.good_episodes) ?? [1]));
  const totalEpisodes = data?.episodes_per_day.reduce((n, r) => n + r.episodes, 0) ?? 0;
  const median = data?.fulfilment.median_hours_to_delivery;

  return (
    <>
      <PageHeader title="Analytics" description="Recording output and request fulfilment. Dates are in UTC." />

      <FilterBar>
        <FilterField label="Period">
          <SegmentedTabs<Preset>
            value={preset}
            onChange={setPreset}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
              { value: "custom", label: "Custom" },
            ]}
          />
        </FilterField>
        {preset === "custom" && (
          <>
            <FilterField label="From">
              <Input
                type="date"
                value={custom.start}
                max={custom.end}
                onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
              />
            </FilterField>
            <FilterField label="To">
              <Input
                type="date"
                value={custom.end}
                min={custom.start}
                onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
              />
            </FilterField>
          </>
        )}
      </FilterBar>

      <ErrorAlert error={analytics.error} title="Could not load analytics" />

      {!data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Episodes recorded" value={totalEpisodes.toLocaleString()} />
            <StatCard
              label="Requests submitted"
              value={Object.values(data.fulfilment.by_status).reduce((a, b) => a + b, 0)}
            />
            <StatCard label="Accepted" value={data.fulfilment.by_status.accepted} tone="good" />
            <StatCard
              label="Median time to delivery"
              value={median === null || median === undefined ? "—" : median < 48 ? `${median} h` : `${(median / 24).toFixed(1)} d`}
              hint="Submitted → first delivery"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by status</CardTitle>
                <CardDescription>Requests submitted in this period, by current status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {STATUSES.map((s) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${STATUS_DOT[s]}`} />
                      {STATUS_LABELS[s]}
                    </span>
                    <span className="font-medium tabular-nums">{data.fulfilment.by_status[s]}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top tasks</CardTitle>
                <CardDescription>By number of good episodes recorded.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {data.top_tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No good episodes in this period.</p>
                )}
                {data.top_tasks.map((t) => (
                  <div key={t.task_name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{t.task_name}</span>
                      <span className="font-medium tabular-nums">{t.good_episodes}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(t.good_episodes / maxGood) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Episodes per day</CardTitle>
              <CardDescription>Recorded episodes by robot, newest day first.</CardDescription>
            </CardHeader>
            <CardContent>
              {days.length === 0 ? (
                <EmptyState icon={BarChart3Icon} title="No episodes recorded in this period" />
              ) : (
                <div className="max-h-[28rem] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead>Day</TableHead>
                        {robots.map((r) => (
                          <TableHead key={r} className="text-right">
                            {r}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map(([day, counts]) => (
                        <TableRow key={day}>
                          <TableCell className="whitespace-nowrap">{formatDate(day)}</TableCell>
                          {robots.map((r) => (
                            <TableCell key={r} className="text-right tabular-nums text-muted-foreground">
                              {counts[r] ?? "·"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium tabular-nums">
                            {Object.values(counts).reduce((a, b) => a + b, 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
