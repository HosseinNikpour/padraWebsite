"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/staff/ChangePasswordForm";

import { CrudCard, CrudColumns, CrudPage } from "@/components/admin/crud/CrudPage";
import "@/components/staff/staff.css";

type Me = {
  name: string;
  username: string;
  role: string;
  supervisor: string | null;
  deviceCode: string | null;
};

export default function StaffProfilePage() {
  const [me, setMe] = useState<Me | null>(null);


  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMe(d.me ?? null))
      .catch(() => setMe(null));
  }, []);


  return (
    <CrudPage
      eyebrow="PADRA STAFF"
      title="پروفایل من"
      description="اطلاعات حساب و تغییر رمز عبور"
    >
      <CrudColumns>
        <CrudCard title="اطلاعات حساب">
          {me ? (
            <div className="st-item" style={{ border: 0, padding: 0 }}>
              <dl>
                <div>
                  <dt>نام</dt>
                  <dd>{me.name}</dd>
                </div>
                <div>
                  <dt>نام کاربری</dt>
                  <dd dir="ltr">{me.username}</dd>
                </div>
                <div>
                  <dt>نقش</dt>
                  <dd>{me.role}</dd>
                </div>
                <div>
                  <dt>سوپروایزر</dt>
                  <dd>{me.supervisor ?? "—"}</dd>
                </div>
                <div>
                  <dt>کد دستگاه حضور و غیاب</dt>
                  <dd dir="ltr">{me.deviceCode ?? "—"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="st-empty">در حال دریافت...</div>
          )}
        </CrudCard>

        <CrudCard title="تغییر رمز عبور" description="رمز جدید باید حداقل ۸ کاراکتر باشد.">
          <ChangePasswordForm />
        </CrudCard>
      </CrudColumns>
    </CrudPage>
  );
}
