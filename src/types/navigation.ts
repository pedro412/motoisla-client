import type { ReactNode } from "react";

import type { Role } from "@/lib/types/auth";

export type PrivateModule = "pos" | "sales" | "layaway" | "reports" | "expenses" | "purchases" | "products" | "investors" | "settings";

export interface AppNavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  module: PrivateModule;
  requiredRoles?: Role[];
}
