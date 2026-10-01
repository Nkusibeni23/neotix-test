"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { ConfirmProvider } from "@/components/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { ApiError, tokenStore } from "@/lib/api";

// A 401 anywhere means the session is gone (expired, or the user was deactivated).
function onError(error: Error) {
  if (error instanceof ApiError && error.status === 401 && window.location.pathname !== "/login") {
    tokenStore.clear();
    // Full page load on purpose: drops every cached query from the old session.
    window.location.assign(new URL("/login", window.location.origin));
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; created in state so it is not shared between requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError }),
        mutationCache: new MutationCache({ onError }),
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            // 4xx errors (auth, validation, not found) will not succeed on retry.
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <Toaster position="top-right" closeButton duration={4000} visibleToasts={3} />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
