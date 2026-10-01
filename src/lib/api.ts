// Thin fetch wrapper around the FastAPI backend. Every call goes through here so the
// auth header and error handling are the same everywhere.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "desk.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type QueryValue = string | number | boolean | undefined | null;
type Query = Record<string, QueryValue | QueryValue[]>;

export async function api<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown; query?: Query } = {},
): Promise<T> {
  const { body, query, headers, ...rest } = init;

  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    // Arrays become repeated params (?quality=good&quality=usable), which FastAPI reads as a list.
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.append(key, String(v));
    }
  }

  const token = tokenStore.get();
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
    headers: {
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only throws when no response arrived: server down, offline, or blocked by CORS.
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 401) tokenStore.clear();
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Field names as people see them in the forms, for validation messages.
const FIELD_LABELS: Record<string, string> = {
  task_name: "Task",
  episodes_requested: "Episodes",
  deadline: "Deadline",
  notes: "Notes",
  email: "Email",
  password: "Password",
  name: "Name",
  role: "Role",
  episode_ids: "Episodes",
  file: "File",
};

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

/** Turns any error response into one sentence a person can act on. */
async function errorMessage(res: Response): Promise<string> {
  // A crash or proxy error page: the details mean nothing to the user.
  if (res.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  try {
    const data = await res.json();
    // HTTPException: the API already writes these for people.
    if (typeof data.detail === "string") return data.detail;
    // Validation errors: [{loc: ["body", "episodes_requested"], msg: "Input should be greater than 0"}]
    if (Array.isArray(data.detail)) {
      return (data.detail as ValidationIssue[])
        .map(({ loc, msg }) => {
          const field = FIELD_LABELS[String(loc.at(-1))];
          const text = msg.replace(/^Value error, /, "");
          return field ? `${field}: ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
        })
        .join(". ");
    }
  } catch {
    // body was not JSON
  }
  return "That didn't work. Please try again.";
}
