"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { api, tokenStore } from "@/lib/api";
import { notify } from "@/lib/notify";
import { keys } from "@/lib/queries";
import type { LoginResponse, Role, User } from "@/lib/types";

// localStorage is only readable in the browser; this returns false during server rendering
// and the real value after hydration, without a mismatch warning.
const noop = () => () => {};
export function useHasToken() {
  return useSyncExternalStore(
    noop,
    () => tokenStore.get() !== null,
    () => false,
  );
}
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function useMe() {
  const hasToken = useHasToken();
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api<User>("/auth/me"),
    enabled: hasToken,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export const isStaff = (role: Role | undefined) => role === "operator" || role === "admin";

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<LoginResponse>("/auth/login", { method: "POST", body }),
    onSuccess: ({ access_token, user }) => {
      tokenStore.set(access_token);
      qc.setQueryData(keys.me, user);
      notify.success(`Welcome back, ${user.name.split(" ")[0]}`);
      router.replace("/requests");
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return () => {
    tokenStore.clear();
    qc.clear();
    router.replace("/login");
  };
}
