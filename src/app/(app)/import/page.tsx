"use client";

import { FileTextIcon, Loader2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";

import { columnHelper, DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { useImportEpisodes } from "@/lib/queries";
import type { ImportReport } from "@/lib/types";

type Skipped = ImportReport["skipped"][number];
const col = columnHelper<Skipped>();
const columns = col.columns([
  col.accessor("line", { header: "Line", cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> }),
  col.accessor("episode_id", {
    header: "Episode",
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() ?? "—"}</span>,
  }),
  col.accessor("reason", { header: "Reason" }),
]);

export default function ImportPage() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useImportEpisodes();
  const report = upload.data;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      notify.error(new Error("Choose a .csv file"), "Wrong file type");
      return;
    }
    setFile(f);
    upload.reset();
  };

  const run = () =>
    file &&
    upload.mutate(file, {
      onSuccess: (r) =>
        notify.success(
          "Import finished",
          `${r.imported} new · ${r.already_present} already present · ${r.skipped_count} skipped`,
        ),
      onError: (e) => notify.error(e, "Import failed"),
    });

  return (
    <>
      <PageHeader
        title="Import episodes"
        description="Upload a CSV export from the recording system. Safe to re-run: episodes already imported are never duplicated or overwritten."
      />

      <Card>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloudIcon className="size-6" />
            </span>
            <span className="space-y-1">
              <span className="block font-medium">Drop a CSV here, or click to browse</span>
              <span className="block text-sm text-muted-foreground">
                Columns: episode_id, robot_id, task_name, recorded_at, duration_seconds, operator_name, quality
              </span>
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {file && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove file"
                  onClick={() => {
                    setFile(null);
                    upload.reset();
                  }}
                >
                  <XIcon />
                </Button>
                <Button onClick={run} disabled={upload.isPending}>
                  {upload.isPending && <Loader2Icon className="animate-spin" />}
                  {upload.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold">Report</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rows in file" value={report.total_rows} />
            <StatCard label="Imported" value={report.imported} tone="good" />
            <StatCard label="Already present" value={report.already_present} hint="Skipped safely" />
            <StatCard label="Skipped" value={report.skipped_count} tone={report.skipped_count ? "bad" : undefined} />
          </div>
          {report.skipped_count > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Rows that were not imported, and why
                {report.skipped.length < report.skipped_count &&
                  ` (first ${report.skipped.length} of ${report.skipped_count})`}
                :
              </p>
              <DataTable
                columns={columns}
                data={report.skipped}
                getRowId={(s) => String(s.line)}
                renderCard={(s) => (
                  <div className="space-y-1 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Line {s.line} · <span className="font-mono">{s.episode_id ?? "no id"}</span>
                    </p>
                    <p>{s.reason}</p>
                  </div>
                )}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
