"use client";

// Temporary: previews the shared components until the login and dashboard pages exist.
import { columnHelper, DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { QualityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/notify";
import type { DatasetRequest, RequestStatus } from "@/lib/types";

const statuses: RequestStatus[] = ["submitted", "in_progress", "delivered", "accepted", "rejected"];

const sample: DatasetRequest[] = statuses.map((status, i) => ({
  id: i + 1,
  client: { id: 4, name: "Acme Robotics", organisation: "Acme Robotics" },
  task_name: ["pick cup", "fold towel", "open drawer", "pour water", "wipe table"][i],
  episodes_requested: 20 * (i + 1),
  episodes_assigned: 15 * i,
  deadline: `2026-10-${10 + i}`,
  notes: null,
  status,
  created_at: "2026-09-30T10:00:00Z",
}));

const col = columnHelper<DatasetRequest>();
const columns = col.columns([
  col.accessor("task_name", { header: "Task" }),
  col.display({ id: "client", header: "Client", cell: ({ row }) => row.original.client.name }),
  col.display({
    id: "progress",
    header: "Episodes",
    cell: ({ row }) => `${row.original.episodes_assigned} / ${row.original.episodes_requested}`,
  }),
  col.accessor("deadline", { header: "Deadline", cell: ({ getValue }) => formatDate(getValue()) }),
  col.accessor("status", { header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
]);

export default function Home() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl space-y-8 p-4 sm:p-6">
      <PageHeader
        title="Dataset Request Desk"
        description="Component preview"
        actions={
<Button>New request</Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
        <QualityBadge quality="good" />
        <QualityBadge quality="usable" />
        <QualityBadge quality="bad" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => notify.success("Request created", "Pick cup · 200 episodes")}>
          Success toast
        </Button>
        <Button variant="outline" onClick={() => notify.info("Request moved to In progress")}>
          Info toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            notify.error(new ApiError(409, "Request needs 20 episodes before it can be delivered"), "Could not deliver")
          }
        >
          Error toast
        </Button>
      </div>
      <DataTable columns={columns} data={sample} getRowId={(r) => String(r.id)} />
    </main>
  );
}
