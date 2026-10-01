// Thin fetch wrapper around the FastAPI backend. Every call goes through here so the
// auth header and error handling are the same everywhere.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
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
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) tokenStore.clear();
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// FastAPI returns {"detail": "..."} for HTTPException and {"detail": [...]} for validation errors.
async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((d: { msg: string }) => d.msg).join(", ");
  } catch {
    // body was not JSON
  }
  return `Request failed (${res.status})`;
}
