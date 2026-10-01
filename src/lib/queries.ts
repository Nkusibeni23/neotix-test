// Every API call the UI makes, as TanStack Query hooks. Query keys live here so a mutation can
// invalidate exactly what it changed.
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  Analytics,
  DatasetRequest,
  DatasetRequestDetail,
  Episode,
  ImportReport,
  Page,
  Quality,
  RequestStatus,
  Role,
  User,
} from "@/lib/types";

export type EpisodeFilters = {
  task_name?: string;
  quality?: Quality[];
  robot_id?: string;
  unassigned?: boolean;
  limit?: number;
  offset?: number;
};

export const keys = {
  me: ["me"] as const,
  requests: ["requests"] as const,
  request: (id: number) => ["requests", id] as const,
  requestEpisodes: (id: number) => ["requests", id, "episodes"] as const,
  episodes: (filters: EpisodeFilters) => ["episodes", filters] as const,
  tasks: ["episodes", "tasks"] as const,
  analytics: (start?: string, end?: string) => ["analytics", { start, end }] as const,
  users: ["users"] as const,
};

// --- requests -----------------------------------------------------------------------------

export const useRequests = () =>
  useQuery({ queryKey: keys.requests, queryFn: () => api<DatasetRequest[]>("/requests") });

export const useRequest = (id: number) =>
  useQuery({ queryKey: keys.request(id), queryFn: () => api<DatasetRequestDetail>(`/requests/${id}`) });

export const useRequestEpisodes = (id: number) =>
  useQuery({
    queryKey: keys.requestEpisodes(id),
    queryFn: () => api<Episode[]>(`/requests/${id}/episodes`),
  });

export interface NewRequest {
  task_name: string;
  episodes_requested: number;
  deadline: string;
  notes?: string;
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewRequest) =>
      api<DatasetRequestDetail>("/requests", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

/** After any change to one request, refresh it, its episodes, the list and episode picker. */
function useRefreshRequest(id: number) {
  const qc = useQueryClient();
  return (detail?: DatasetRequestDetail) => {
    if (detail) qc.setQueryData(keys.request(id), detail);
    qc.invalidateQueries({ queryKey: keys.requests });
    qc.invalidateQueries({ queryKey: ["episodes"] });
  };
}

export function useTransition(id: number) {
  const refresh = useRefreshRequest(id);
  return useMutation({
    mutationFn: (to_status: RequestStatus) =>
      api<DatasetRequestDetail>(`/requests/${id}/transitions`, {
        method: "POST",
        body: { to_status },
      }),
    onSuccess: refresh,
  });
}

export function useAssign(id: number) {
  const refresh = useRefreshRequest(id);
  return useMutation({
    mutationFn: (episode_ids: number[]) =>
      api<DatasetRequestDetail>(`/requests/${id}/assignments`, {
        method: "POST",
        body: { episode_ids },
      }),
    onSuccess: refresh,
  });
}

export function useUnassign(id: number) {
  const refresh = useRefreshRequest(id);
  return useMutation({
    mutationFn: (episodeId: number) =>
      api<void>(`/requests/${id}/assignments/${episodeId}`, { method: "DELETE" }),
    onSuccess: () => refresh(),
  });
}

// --- episodes -----------------------------------------------------------------------------

export const useEpisodes = (filters: EpisodeFilters, enabled = true) =>
  useQuery({
    queryKey: keys.episodes(filters),
    queryFn: () => api<Page<Episode>>("/episodes", { query: filters }),
    // Keep showing the current page while the next filter/page loads (no flicker).
    placeholderData: keepPreviousData,
    enabled,
  });

export const useTasks = () =>
  useQuery({ queryKey: keys.tasks, queryFn: () => api<string[]>("/episodes/tasks"), staleTime: 60_000 });

export function useImportEpisodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api<ImportReport>("/episodes/import", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodes"] }),
  });
}

// --- analytics & users --------------------------------------------------------------------

export const useAnalytics = (start?: string, end?: string) =>
  useQuery({
    queryKey: keys.analytics(start, end),
    queryFn: () => api<Analytics>("/analytics", { query: { start, end } }),
    placeholderData: keepPreviousData,
  });

export const useUsers = () =>
  useQuery({ queryKey: keys.users, queryFn: () => api<User[]>("/users") });

export interface NewUser {
  email: string;
  name: string;
  password: string;
  role: Role;
  organisation?: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewUser) => api<User>("/users", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; role?: Role; is_active?: boolean }) =>
      api<User>(`/users/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }),
  });
}
