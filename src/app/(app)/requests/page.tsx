"use client";

import { CalendarIcon, ChevronRightIcon, InboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "cn";

import { columnHelper, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { EpisodeProgress } from "@/components/episode-progress";
import { ErrorAlert } from "@/components/error-alert";
import { SearchInput, SegmentedTabs } from "@/components/filters";
import { NewRequestDialog } from "@/components/new-request-dialog";
import { PageHeader } from "@/components/page-header";
import { STATUS_LABELS, StatusBadge } from "@/components/status-badge";
import { isStaff, useMe } from "@/lib/auth";
import { daysUntil, formatDate, formatDue } from "@/lib/format";
import { useRequests } from "@/lib/queries";
import type { DatasetRequest, RequestStatus } from "@/lib/types";

const STATUSES: RequestStatus[] = ["submitted", "in_progress", "delivered", "accepted", "rejected"];
type Tab = RequestStatus | "all";

function Deadline({ request }: { request: DatasetRequest }) {
  const open = !["accepted", "delivered"].includes(request.status);
  const days = daysUntil(request.deadline);
  return (
    <div className="flex flex-col">
      <span>{formatDate(request.deadline)}</span>
      {open && (
        <span
          className={cn(
            "text-xs",
            days < 0 ? "font-medium text-destructive" : days <= 7 ? "text-status-in-progress" : "text-muted-foreground",
          )}
        >
          {days < 0 ? `Overdue · ${formatDue(request.deadline)}` : `Due ${formatDue(request.deadline)}`}
        </span>
      )}
    </div>
  );
}

const col = columnHelper<DatasetRequest>();

export default function RequestsPage() {
  const router = useRouter();
  const { data: user } = useMe();
  const staff = isStaff(user?.role);
  const requests = useRequests();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
    for (const r of requests.data ?? []) c[r.status]++;
    return c;
  }, [requests.data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests.data ?? []).filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (!q || r.task_name.includes(q) || r.client.name.toLowerCase().includes(q)),
    );
  }, [requests.data, tab, search]);

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("task_name", {
          header: "Task",
          // A real link (not only a clickable row) so keyboard and screen-reader users can open it.
          cell: ({ row }) => (
            <div className="flex flex-col">
              <Link
                href={`/requests/${row.original.id}`}
                onClick={(e) => e.stopPropagation()}
                className="w-fit rounded-sm font-medium capitalize outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {row.original.task_name}
              </Link>
              <span className="text-xs text-muted-foreground">#{row.original.id}</span>
            </div>
          ),
        }),
        ...(staff
          ? [
              col.display({
                id: "client",
                header: "Client",
                cell: ({ row }) => row.original.client.organisation ?? row.original.client.name,
              }),
            ]
          : []),
        col.display({
          id: "progress",
          header: "Episodes",
          cell: ({ row }) => (
            <EpisodeProgress
              assigned={row.original.episodes_assigned}
              requested={row.original.episodes_requested}
              className="max-w-40"
            />
          ),
        }),
        col.display({ id: "deadline", header: "Deadline", cell: ({ row }) => <Deadline request={row.original} /> }),
        col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
        col.display({
          id: "go",
          header: "",
          cell: () => <ChevronRightIcon className="ml-auto size-4 text-muted-foreground" />,
        }),
      ]),
    [staff],
  );

  const hasAny = (requests.data?.length ?? 0) > 0;

  return (
    <>
      <PageHeader
        title={staff ? "Requests" : "My requests"}
        description={
          staff
            ? "Every client request. Open one to move it forward or assign episodes."
            : "Track your dataset requests and review deliveries."
        }
        actions={user?.role === "client" && <NewRequestDialog />}
      />

      <ErrorAlert error={requests.error} title="Could not load requests" />

      {!requests.isLoading && !hasAny ? (
        <EmptyState
          icon={InboxIcon}
          title="No requests yet"
          description={
            staff
              ? "Requests appear here as soon as a client submits one."
              : "Submit your first request and we'll start collecting episodes for you."
          }
          action={user?.role === "client" && <NewRequestDialog />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedTabs<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "All", count: requests.data?.length },
                ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], count: counts[s] })),
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={staff ? "Search task or client" : "Search task"}
              className="w-full lg:w-72"
            />
          </div>

          <DataTable
            columns={columns}
            data={visible}
            isLoading={requests.isLoading}
            getRowId={(r) => String(r.id)}
            onRowClick={(r) => router.push(`/requests/${r.id}`)}
            emptyMessage="No requests match these filters."
            renderCard={(r) => (
              <Link href={`/requests/${r.id}`} className="block space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize">{r.task_name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{r.id}
                      {staff && ` · ${r.client.organisation ?? r.client.name}`}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <EpisodeProgress assigned={r.episodes_assigned} requested={r.episodes_requested} />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  Due {formatDate(r.deadline)}
                </p>
              </Link>
            )}
          />
        </>
      )}
    </>
  );
}
