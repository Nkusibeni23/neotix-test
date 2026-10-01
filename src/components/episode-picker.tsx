"use client";

import type { RowSelectionState } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { columnHelper, DataTable } from "@/components/data-table";
import { ChipGroup, FilterBar, FilterField, OptionSelect } from "@/components/filters";
import { QualityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatDuration } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useAssign, useEpisodes, useTasks, type EpisodeFilters } from "@/lib/queries";
import type { DatasetRequest, Episode, Quality } from "@/lib/types";

const PAGE_SIZE = 25;
const ROBOTS = ["arm-01", "arm-02", "arm-03", "mobile-01", "humanoid-01"];
const QUALITY_OPTIONS: { value: Quality; label: string; dotClass: string }[] = [
  { value: "good", label: "Good", dotClass: "bg-quality-good" },
  { value: "usable", label: "Usable", dotClass: "bg-quality-usable" },
  { value: "bad", label: "Bad", dotClass: "bg-quality-bad" },
];

const assignable = (e: Episode) => e.quality !== "bad" && e.request_id === null;

const col = columnHelper<Episode>();

export function EpisodePicker({ request }: { request: DatasetRequest }) {
  const tasks = useTasks();
  const defaults = {
    task: tasks.data?.includes(request.task_name) ? request.task_name : undefined,
    quality: ["good", "usable"] as Quality[],
    robot: undefined as string | undefined,
    unassigned: true,
  };
  // undefined = "user has not touched it", so the default can follow the tasks list loading.
  const [task, setTask] = useState<string | null | undefined>(undefined);
  const [quality, setQuality] = useState<Quality[]>(defaults.quality);
  const [robot, setRobot] = useState<string | undefined>();
  const [unassigned, setUnassigned] = useState(true);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const effectiveTask = task === undefined ? defaults.task : (task ?? undefined);
  const filters: EpisodeFilters = {
    task_name: effectiveTask,
    quality,
    robot_id: robot,
    unassigned,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const episodes = useEpisodes(filters, !tasks.isLoading);
  const assign = useAssign(request.id);

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };
  const isFiltered =
    effectiveTask !== defaults.task ||
    quality.join() !== defaults.quality.join() ||
    robot !== undefined ||
    unassigned !== defaults.unassigned;
  const clear = () => {
    setTask(undefined);
    setQuality(defaults.quality);
    setRobot(undefined);
    setUnassigned(true);
    setPage(0);
  };

  const selectedIds = Object.keys(selection).filter((k) => selection[k]).map(Number);
  const missing = Math.max(0, request.episodes_requested - request.episodes_assigned);
  const total = episodes.data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  const columns = useMemo(
    () =>
      col.columns([
        col.display({
          id: "select",
          header: ({ table }) => (
            <Checkbox
              aria-label="Select all on this page"
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
              onCheckedChange={(v) => table.toggleAllRowsSelected(v)}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              aria-label={`Select ${row.original.episode_id}`}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onCheckedChange={(v) => row.toggleSelected(v)}
            />
          ),
        }),
        col.accessor("episode_id", {
          header: "Episode",
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium">{getValue()}</span>,
        }),
        col.accessor("task_name", { header: "Task", cell: ({ getValue }) => <span className="capitalize">{getValue()}</span> }),
        col.accessor("robot_id", { header: "Robot" }),
        col.accessor("quality", { header: "Quality", cell: ({ getValue }) => <QualityBadge quality={getValue()} /> }),
        col.accessor("duration_seconds", { header: "Duration", cell: ({ getValue }) => formatDuration(getValue()) }),
        col.accessor("recorded_at", {
          header: "Recorded",
          cell: ({ getValue }) => <span className="text-muted-foreground">{formatDateTime(getValue())}</span>,
        }),
        col.accessor("request_id", {
          header: "Assigned",
          cell: ({ getValue }) => {
            const id = getValue();
            return id === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className="text-xs text-muted-foreground">#{id}{id === request.id && " (this)"}</span>
            );
          },
        }),
      ]),
    [request.id],
  );

  const submit = () =>
    assign.mutate(selectedIds, {
      onSuccess: () => {
        notify.success(`${selectedIds.length} episode${selectedIds.length === 1 ? "" : "s"} assigned`);
        setSelection({});
      },
      onError: (e) => notify.error(e, "Could not assign episodes"),
    });

  return (
    <div className="space-y-4">
      <FilterBar
        onClear={clear}
        canClear={isFiltered}
        summary={
          episodes.isFetching && !episodes.data
            ? "Loading…"
            : `${total.toLocaleString()} episode${total === 1 ? "" : "s"} match`
        }
      >
        <FilterField label="Task" className="w-full sm:w-auto">
          <OptionSelect
            value={effectiveTask}
            onChange={(v) => resetPage(setTask)(v ?? null)}
            allLabel="All tasks"
            options={(tasks.data ?? []).map((t) => ({ value: t, label: t }))}
            className="capitalize"
          />
        </FilterField>
        <FilterField label="Robot" className="w-full sm:w-auto">
          <OptionSelect
            value={robot}
            onChange={resetPage(setRobot)}
            allLabel="All robots"
            options={ROBOTS.map((r) => ({ value: r, label: r }))}
            className="sm:w-40"
          />
        </FilterField>
        <FilterField label="Quality">
          <ChipGroup options={QUALITY_OPTIONS} value={quality} onChange={resetPage(setQuality)} />
        </FilterField>
        <Label className="flex h-10 items-center gap-2.5 rounded-lg border bg-background px-3.5 text-sm font-medium">
          <Checkbox checked={unassigned} onCheckedChange={(v) => resetPage(setUnassigned)(v)} />
          Unassigned only
        </Label>
      </FilterBar>

      <DataTable
        columns={columns}
        data={episodes.data?.items}
        isLoading={episodes.isLoading || tasks.isLoading}
        getRowId={(e) => String(e.id)}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        canSelectRow={assignable}
        emptyMessage="No episodes match these filters. Try widening them."
        renderCard={(e) => (
          <label className="flex gap-3">
            <Checkbox
              className="mt-0.5"
              checked={!!selection[e.id]}
              disabled={!assignable(e)}
              onCheckedChange={(v) => setSelection((s) => ({ ...s, [e.id]: v }))}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">{e.episode_id}</span>
                <QualityBadge quality={e.quality} />
              </div>
              <p className="text-sm capitalize">{e.task_name}</p>
              <p className="text-xs text-muted-foreground">
                {e.robot_id} · {formatDuration(e.duration_seconds)} · {formatDateTime(e.recorded_at)}
                {e.request_id !== null && ` · on #${e.request_id}`}
              </p>
            </div>
          </label>
        )}
      />

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {from}–{to} of {total.toLocaleString()}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeftIcon />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage((p) => p + 1)}>
            Next
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 pl-4 shadow-lg backdrop-blur">
          <div className="text-sm">
            <span className="font-medium">{selectedIds.length} selected</span>
            {missing > 0 && (
              <span className="text-muted-foreground">
                {" "}
                · {Math.max(0, missing - selectedIds.length)} still needed after this
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSelection({})}>
              Clear
            </Button>
            <Button onClick={submit} disabled={assign.isPending}>
              {assign.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              Assign to request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
