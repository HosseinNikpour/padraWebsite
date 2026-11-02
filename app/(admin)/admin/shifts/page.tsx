"use client";

import { useState } from "react";

import { CrudPage } from "@/components/admin/crud/CrudPage";
import "@/components/staff/staff.css";
import { fa } from "@/lib/format";
import { useStaffMe } from "@/lib/use-staff-me";

import MyShifts from "./MyShifts";
import SwapApprovals from "./SwapApprovals";
import TeamShifts from "./TeamShifts";

import "./shifts.css";

type Tab = "mine" | "team" | "swaps";

export default function ShiftsPage() {
  const { me, can, loaded } = useStaffMe();
  const [tab, setTab] = useState<Tab>("mine");
  const [pending, setPending] = useState(0);

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="شیفت‌های کاری"
      description="تقویم ماهانه و هفتگی شیفت، شیفت روزانه‌ی پرسنل و درخواست جابه‌جایی"
    >
      <div className="st-tabs" role="tablist">
        <button type="button" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>
          شیفت من
        </button>
        {can?.shiftsView && (
          <button type="button" className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>
            شیفت پرسنل
          </button>
        )}
        {can?.swapApprove && (
          <button type="button" className={tab === "swaps" ? "active" : ""} onClick={() => setTab("swaps")}>
            تأیید جابه‌جایی{pending > 0 && <span>{fa(pending)}</span>}
          </button>
        )}
      </div>

      {!loaded ? (
        <div className="st-empty">در حال دریافت...</div>
      ) : (
        <>
          {tab === "mine" && <MyShifts myId={me?.id} />}
          {tab === "team" && can?.shiftsView && <TeamShifts />}
          {tab === "swaps" && can?.swapApprove && <SwapApprovals onChange={setPending} />}
        </>
      )}
    </CrudPage>
  );
}
