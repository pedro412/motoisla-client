import type { ReactNode } from "react";

import type { Role } from "@/lib/types/auth";

export type PrivateModule = "pos" | "reports";

export interface AppNavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  module: PrivateModule;
  requiredRoles?: Role[];
}
