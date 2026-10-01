"use client";

import { ArrowLeftIcon, FilmIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useConfirm } from "@/components/confirm-dialog";
import { columnHelper, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { EpisodePicker } from "@/components/episode-picker";
import { EpisodeProgress } from "@/components/episode-progress";
import { ErrorAlert } from "@/components/error-alert";
import { RequestActions } from "@/components/request-actions";
import { QualityBadge, StatusBadge } from "@/components/status-badge";
import { StatusTimeline } from "@/components/status-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isStaff, useMe } from "@/lib/auth";
import { formatDate, formatDateTime, formatDue, formatDuration } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useRequest, useRequestEpisodes, useUnassign } from "@/lib/queries";
import type { Episode } from "@/lib/types";

const col = columnHelper<Episode>();

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default function RequestDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data: user } = useMe();
  const request = useRequest(id);
  const episodes = useRequestEpisodes(id);
  const { mutateAsync: unassign } = useUnassign(id);
  const confirm = useConfirm();

  const req = request.data;
  const canEdit = isStaff(user?.role) && req?.status === "in_progress";

  const removeEpisode = useCallback(
    (e: Episode) =>
      confirm({
        title: `Remove ${e.episode_id}?`,
        description: "It goes back to the pool and can be assigned to any request.",
        confirmLabel: "Remove episode",
        tone: "destructive",
        onConfirm: () =>
          unassign(e.id).then(
            () => notify.success(`${e.episode_id} removed`),
            (err) => {
              notify.error(err, "Could not remove episode");
              throw err;
            },
          ),
      }),
    [confirm, unassign],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("episode_id", {
          header: "Episode",
          cell: ({ getValue }) => <span className="font-mono text-xs font-medium">{getValue()}</span>,
        }),
        col.accessor("robot_id", { header: "Robot" }),
        col.accessor("quality", { header: "Quality", cell: ({ getValue }) => <QualityBadge quality={getValue()} /> }),
        col.accessor("duration_seconds", { header: "Duration", cell: ({ getValue }) => formatDuration(getValue()) }),
        col.accessor("recorded_at", {
          header: "Recorded",
          cell: ({ getValue }) => <span className="text-muted-foreground">{formatDateTime(getValue())}</span>,
        }),
        ...(canEdit
          ? [
              col.display({
                id: "remove",
                header: "",
                cell: ({ row }) => (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${row.original.episode_id}`}
                    onClick={() => removeEpisode(row.original)}
                  >
                    <Trash2Icon />
                  </Button>
                ),
              }),
            ]
          : []),
      ]),
    [canEdit, removeEpisode],
  );

  if (request.error) {
    return (
      <>
        <BackLink />
        <ErrorAlert error={request.error} title="Could not load this request" />
      </>
    );
  }

  if (!req) {
    return (
      <>
        <BackLink />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight capitalize">{req.task_name}</h1>
            <StatusBadge status={req.status} className="h-6 px-2.5 text-sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            Request #{req.id} · {req.client.organisation ?? req.client.name} · submitted{" "}
            {formatDate(req.created_at)}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Actions come first on phones, in the sidebar on desktop. */}
        <div className="space-y-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Next step</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestActions request={req} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Detail label="Client">{req.client.organisation ?? req.client.name}</Detail>
                <Detail label="Episodes requested">{req.episodes_requested}</Detail>
                <Detail label="Deadline">
                  {formatDate(req.deadline)}
                  <span className="block text-xs font-normal text-muted-foreground">{formatDue(req.deadline)}</span>
                </Detail>
                <Detail label="Last updated">{formatDateTime(req.updated_at)}</Detail>
              </dl>
              {req.notes && (
                <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap">{req.notes}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={req.history} />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:order-1 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>
                {req.episodes_assigned >= req.episodes_requested
                  ? "All requested episodes are assigned."
                  : `${req.episodes_requested - req.episodes_assigned} more episode${
                      req.episodes_requested - req.episodes_assigned === 1 ? "" : "s"
                    } needed before delivery.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EpisodeProgress assigned={req.episodes_assigned} requested={req.episodes_requested} />
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">Assigned episodes</h2>
            {!episodes.isLoading && episodes.data?.length === 0 ? (
              <EmptyState
                icon={FilmIcon}
                title="No episodes assigned yet"
                description={
                  canEdit
                    ? "Pick episodes from the list below."
                    : isStaff(user?.role)
                      ? "Start work on this request to assign episodes."
                      : "The operations team will assign episodes as they collect them."
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={episodes.data}
                isLoading={episodes.isLoading}
                getRowId={(e) => String(e.id)}
                renderCard={(e) => (
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-medium">{e.episode_id}</span>
                      <p className="text-xs text-muted-foreground">
                        {e.robot_id} · {formatDuration(e.duration_seconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <QualityBadge quality={e.quality} />
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${e.episode_id}`}
                          onClick={() => removeEpisode(e)}
                        >
                          <Trash2Icon />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              />
            )}
          </section>

          {canEdit && (
            <section className="space-y-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">Add episodes</h2>
                <p className="text-sm text-muted-foreground">
                  Only good or usable episodes that are not on another request can be selected.
                </p>
              </div>
              <EpisodePicker request={req} />
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 w-fit" nativeButton={false} render={<Link href="/requests" />}>
      <ArrowLeftIcon />
      All requests
    </Button>
  );
}
