export type Role = "ADMIN" | "CASHIER" | "INVESTOR";

export interface AuthSession {
  isAuthenticated: boolean;
  role?: Role;
  username?: string;
  firstName?: string;
  hasPIN?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  uid: string;
  token: string;
  new_password: string;
}
