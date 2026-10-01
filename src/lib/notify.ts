import { toast } from "sonner";

import { ApiError } from "@/lib/api";

// One place that decides how feedback looks, so every page reads the same.
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  info: (title: string, description?: string) => toast.info(title, { description }),

  // Turns any thrown value into a readable toast. The server's message is the most useful
  // detail (e.g. "Request needs 20 episodes before it can be delivered").
  error: (error: unknown, title = "Something went wrong") => {
    const description =
      error instanceof ApiError
        ? error.status === 403
          ? "You don't have permission to do that."
          : error.message
        : error instanceof Error
          ? error.message
          : undefined;
    return toast.error(title, { description });
  },
};
