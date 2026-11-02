import { Suspense } from "react";

import AccountClient from "./AccountClient";

export const metadata = { title: "ورود / ثبت‌نام | پادرا" };

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountClient />
    </Suspense>
  );
}
