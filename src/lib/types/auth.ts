export type Role = "ADMIN" | "CASHIER" | "INVESTOR";

export interface AuthSession {
  isAuthenticated: boolean;
  role?: Role;
  username?: string;
}
