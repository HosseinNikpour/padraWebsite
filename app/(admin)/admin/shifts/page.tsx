"use client";

import { useState } from "react";

import { CrudPage } from "@/components/admin/crud/CrudPage";
import { WorkTabs, type WorkTab } from "@/components/staff/Workspace";
import "@/components/staff/staff.css";
import { useStaffMe } from "@/lib/use-staff-me";

import MyShifts from "./MyShifts";
import SwapApprovals from "./SwapApprovals";
import TeamShifts from "./TeamShifts";

import "./shifts.css";

type Tab = "mine" | "requests" | "team" | "swaps";

export default function ShiftsPage() {
  const { me, can, loaded } = useStaffMe();
  const [tab, setTab] = useState<Tab>("mine");
  const [pending, setPending] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const tabs: WorkTab<Tab>[] = [
    { key: "mine", label: "شیفت من" },
    { key: "requests", label: "درخواست‌های جابه‌جایی" },
    ...(can?.shiftsView ? [{ key: "team" as Tab, label: "شیفت پرسنل" }] : []),
    ...(can?.swapApprove ? [{ key: "swaps" as Tab, label: "تأیید جابه‌جایی", badge: pending }] : []),
  ];

  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="شیفت‌های کاری"
      description="تقویم ماهانه و هفتگی شیفت، شیفت روزانه‌ی پرسنل و درخواست جابه‌جایی"
    >
      <WorkTabs tabs={tabs} value={tab} onChange={setTab} />

      {!loaded ? (
        <div className="st-empty">در حال دریافت...</div>
      ) : (
        <>
          {(tab === "mine" || tab === "requests") && (
            <MyShifts
              myId={me?.id}
              section={tab === "mine" ? "calendar" : "swaps"}
              formOpen={formOpen}
              onFormOpenChange={setFormOpen}
              onPickDate={() => {
                setFormOpen(true);
                setTab("requests");
              }}
            />
          )}
          {tab === "team" && can?.shiftsView && <TeamShifts />}
          {tab === "swaps" && can?.swapApprove && <SwapApprovals onChange={setPending} />}
        </>
      )}
    </CrudPage>
  );
}
