"use client";

import { useEffect, useState } from "react";

export type StaffCan = {
  leaveSupervise: boolean;
  leaveFinal: boolean;
  leaveViewAll: boolean;
  shiftsView: boolean;
  shiftsManage: boolean;
  swapApprove: boolean;
  attendanceView: boolean;
  attendanceManage: boolean;
};

export type StaffMe = {
  id?: number;
  name: string;
  username: string;
  role: string;
  supervisor: string | null;
  deviceCode: string | null;
};

/** مشخصات و دسترسی‌های پرسنل واردشده (فقط برای رابط کاربری) */
export function useStaffMe() {
  const [state, setState] = useState<{ me: StaffMe | null; can: StaffCan | null; loaded: boolean }>({
    me: null,
    can: null,
    loaded: false,
  });

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setState({ me: d.me ?? null, can: d.can ?? null, loaded: true }))
      .catch(() => setState({ me: null, can: null, loaded: true }));
  }, []);

  return state;
}
