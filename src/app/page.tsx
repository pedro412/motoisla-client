import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE, ROLE_COOKIE } from "@/lib/auth/cookies";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasAccess = Boolean(cookieStore.get(ACCESS_COOKIE)?.value);
  const role = cookieStore.get(ROLE_COOKIE)?.value;

  if (!hasAccess) {
    redirect("/catalog");
  }

  if (role === "ADMIN") {
    redirect("/admin/reports");
  }

  redirect("/pos");
}
