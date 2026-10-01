import { toast } from "sonner";

// One place that decides how feedback looks, so every page reads the same.
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  info: (title: string, description?: string) => toast.info(title, { description }),

  // Turns any thrown value into a readable toast. The server's message is the most useful
  // detail (e.g. "Request needs 20 episodes before it can be delivered").
  error: (error: unknown, title = "Something went wrong") => {
    // ApiError messages are already written for people (by the API, or by lib/api.ts for
    // network and server failures), so they are shown as they are.
    const description = error instanceof Error ? error.message : undefined;
    return toast.error(title, { description });
  },
};
