import type { ReactNode } from "react";

import { requirePagePermission } from "@/lib/auth";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePagePermission("users.view");

  return <>{children}</>;
}
