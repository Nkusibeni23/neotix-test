// Shapes returned by the API. Keep in sync with the backend's Pydantic schemas.

export type Role = "client" | "operator" | "admin";

export type RequestStatus =
  | "submitted"
  | "in_progress"
  | "delivered"
  | "accepted"
  | "rejected";

export type Quality = "good" | "usable" | "bad";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  organisation: string | null;
  is_active: boolean;
}

export interface Episode {
  id: number;
  episode_id: string;
  robot_id: string;
  task_name: string;
  recorded_at: string;
  duration_seconds: number;
  operator_name: string;
  quality: Quality;
  request_id: number | null;
}

export interface StatusEvent {
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  changed_by: Pick<User, "id" | "name">;
  changed_at: string;
}

export interface DatasetRequest {
  id: number;
  client: Pick<User, "id" | "name" | "organisation">;
  task_name: string;
  episodes_requested: number;
  episodes_assigned: number;
  deadline: string;
  notes: string | null;
  status: RequestStatus;
  created_at: string;
  history?: StatusEvent[];
}

export interface Page<T> {
  items: T[];
  total: number;
}
