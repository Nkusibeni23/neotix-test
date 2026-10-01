"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { STATUS_LABELS } from "@/components/status-badge";
import { api, API_URL } from "@/lib/api";
import { notify } from "@/lib/notify";
import { keys } from "@/lib/queries";
import type { RequestStatus, User } from "@/lib/types";

interface RequestEvent {
  type: "request.created" | "request.updated";
  request_id: number;
  status: RequestStatus;
  task_name: string;
  actor_id: number;
}

export type LiveState = "connecting" | "live" | "offline";

const MAX_BACKOFF_MS = 30_000;

/**
 * Keeps one Server-Sent Events connection open while signed in. Each event refreshes the
 * affected queries; changes made by someone else also show a toast.
 *
 * EventSource can't send an Authorization header, so we fetch a 60-second stream token first.
 * On any error we close and reconnect with a fresh token, backing off up to 30 s.
 */
export function useLiveUpdates(user: User | undefined): LiveState {
  const qc = useQueryClient();
  const [state, setState] = useState<LiveState>("connecting");

  useEffect(() => {
    if (!user) return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let backoff = 1_000;
    let stopped = false;

    const onEvent = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as RequestEvent;
      qc.invalidateQueries({ queryKey: keys.requests, exact: true });
      qc.invalidateQueries({ queryKey: keys.request(event.request_id) });
      if (event.actor_id === user.id) return; // our own action already showed a toast

      if (event.type === "request.created" && user.role !== "client") {
        notify.info("New request", `#${event.request_id} · ${event.task_name}`);
      } else if (event.type === "request.updated" && user.role === "client") {
        notify.info(`Request #${event.request_id} updated`, `${event.task_name} is now ${STATUS_LABELS[event.status].toLowerCase()}`);
      }
    };

    const connect = async () => {
      setState("connecting");
      try {
        const { token } = await api<{ token: string }>("/events/token", { method: "POST" });
        if (stopped) return;
        source = new EventSource(`${API_URL}/events?token=${encodeURIComponent(token)}`);
        source.onopen = () => {
          setState("live");
          backoff = 1_000;
          // Catch up on anything that changed while we were disconnected.
          qc.invalidateQueries({ queryKey: keys.requests });
        };
        source.onmessage = onEvent;
        source.onerror = () => {
          source?.close();
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      setState("offline");
      retry = setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
    };
  }, [user, qc]);

  return state;
}
