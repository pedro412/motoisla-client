import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

interface PrivateLayoutProps {
  children: ReactNode;
}

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
