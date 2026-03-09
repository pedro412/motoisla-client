import type { Role } from "./auth";

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  investor_profile_id: string | null;
}

export interface UserCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  password: string;
  investor_id?: string | null;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  role?: Role;
  is_active?: boolean;
  investor_id?: string | null;
}

export interface UsersListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserSummary[];
}
