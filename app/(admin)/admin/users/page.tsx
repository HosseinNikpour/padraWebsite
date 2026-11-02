"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { FormEvent, useEffect, useState } from "react";
import {
  CrudPage,
  CrudColumns,
  CrudCard,
  CrudField,
  CrudFormGrid,
} from "@/components/admin/crud/CrudPage";

type Role = { id: number; name: string; code: string };
type User = {
  id: number;
  name: string;
  username: string;
  phone?: string | null;
  isActive: boolean;
  roleId?: number;
  deviceCode?: string | null;
  supervisorId?: number | null;
  role: Role;
  createdAt: string;
};

export default function UsersPage() {
    const { confirm: confirmDialog, toast } = useFeedback();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editDeviceCode, setEditDeviceCode] = useState("");
  const [editSupervisorId, setEditSupervisorId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
      ]);
      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();
      if (!usersResponse.ok) throw new Error(usersData.error || "خطا در دریافت کاربران");
      if (!rolesResponse.ok) throw new Error(rolesData.error || "خطا در دریافت نقش‌ها");
      const loadedUsers: User[] = Array.isArray(usersData) ? usersData : usersData.users || [];
      const loadedRoles: Role[] = Array.isArray(rolesData) ? rolesData : rolesData.roles || [];
      setUsers(loadedUsers);
      setRoles(loadedRoles);
      if (!roleId && loadedRoles.length) setRoleId(String(loadedRoles[0].id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!name.trim() || !username.trim() || !password || !roleId) {
      setError("تمام اطلاعات کاربر را وارد کنید"); return;
    }
    if (password.length < 8) { setError("رمز عبور باید حداقل ۸ کاراکتر باشد"); return; }
    try {
      setSaving(true);
      const response = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), username: username.trim(), phone: phone.trim(), password, roleId: Number(roleId), deviceCode: deviceCode.trim(), supervisorId: supervisorId ? Number(supervisorId) : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ایجاد کاربر ناموفق بود");
      setSuccess("کاربر با موفقیت ایجاد شد"); setName(""); setUsername(""); setPhone(""); setPassword(""); setDeviceCode(""); setSupervisorId("");
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در ایجاد کاربر"); }
    finally { setSaving(false); }
  }

  function startEditing(user: User) {
    setEditingUser(user); setEditName(user.name); setEditUsername(user.username); setEditPhone(user.phone ?? "");
    setEditRoleId(String(user.roleId ?? user.role?.id ?? "")); setEditPassword("");
    setEditDeviceCode(user.deviceCode ?? ""); setEditSupervisorId(user.supervisorId ? String(user.supervisorId) : "");
    setEditIsActive(user.isActive); setError(""); setSuccess("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingUser) return;
    setError(""); setSuccess("");
    if (!editName.trim() || !editUsername.trim() || !editRoleId) { setError("نام، نام کاربری و نقش را وارد کنید."); return; }
    if (editPassword && editPassword.length < 8) { setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد."); return; }
    try {
      setEditSaving(true);
      const payload: Record<string, unknown> = { id: editingUser.id, name: editName.trim(), username: editUsername.trim(), phone: editPhone.trim(), roleId: Number(editRoleId), isActive: editIsActive, deviceCode: editDeviceCode.trim(), supervisorId: editSupervisorId ? Number(editSupervisorId) : null };
      if (editPassword) payload.password = editPassword;
      const response = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ویرایش کاربر ناموفق بود");
      setEditingUser(null); setSuccess("اطلاعات کاربر ویرایش شد."); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در ویرایش کاربر"); }
    finally { setEditSaving(false); }
  }

  async function deleteUser(user: User) {
    if (!await confirmDialog(`کاربر «${user.name}» حذف شود؟`)) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "حذف کاربر ناموفق بود");
      setSuccess("کاربر حذف شد."); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در حذف کاربر"); }
  }

  return (
    <CrudPage eyebrow="PADRA ADMIN" title="مدیریت کاربران" description="کاربران سامانه و نقش‌های دسترسی را مدیریت کنید." count={users.length} countLabel="کاربر">
      {error && <div className="crud-alert crud-alert--error" role="alert">{error}</div>}
      {success && <div className="crud-alert crud-alert--success" role="status">{success}</div>}
      <CrudColumns className="crud-columns--stacked">
        <CrudCard title="کاربران ثبت‌شده" description="فهرست کاربران و نقش‌های تعریف‌شده در سامانه" actions={<button type="button" className="crud-button crud-button--secondary" onClick={() => void loadData()} disabled={loading}>{loading ? "در حال بارگذاری..." : "بروزرسانی فهرست"}</button>}>
          {loading ? <div className="crud-empty">در حال دریافت کاربران...</div> : users.length === 0 ? <div className="crud-empty">هنوز کاربری ثبت نشده است.</div> : (
            <div className="crud-table-wrap"><table className="crud-table">
              <thead><tr><th>کاربر</th><th>نام کاربری</th><th>موبایل</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id}>
                <td><div className="crud-person"><div className="crud-person__avatar">{user.name?.charAt(0)?.toUpperCase() || "ک"}</div><div><strong>{user.name}</strong><small>شناسه #{user.id}</small></div></div></td>
                <td><span dir="ltr">{user.username}</span></td>
                <td><span dir="ltr">{user.phone ?? "—"}</span></td>
                <td><span className="crud-tag">{user.role?.name || "بدون نقش"}</span></td>
                <td><span className={`crud-status ${user.isActive ? "" : "crud-status--inactive"}`}>{user.isActive ? "فعال" : "غیرفعال"}</span></td>
                <td><div className="crud-row-actions"><button type="button" className="crud-button crud-button--secondary" onClick={() => startEditing(user)}>ویرایش</button><button type="button" className="crud-button crud-button--danger" onClick={() => void deleteUser(user)}>حذف</button></div></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </CrudCard>

        <CrudCard title="ایجاد کاربر جدید" description="اطلاعات حساب کاربری جدید را وارد کنید.">
          <form onSubmit={handleSubmit}>
            <CrudFormGrid>
            <CrudField label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً حسین نیکپور" autoComplete="name" required /></CrudField>
            <CrudField label="نام کاربری"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="username" required /></CrudField>
            <CrudField label="شماره موبایل (برای مشتری الزامی)"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" /></CrudField>
            <CrudField label="رمز عبور"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="حداقل ۸ کاراکتر" dir="ltr" autoComplete="new-password" required minLength={8} /></CrudField>
            <CrudField label="نقش کاربر"><select value={roleId} onChange={(e) => setRoleId(e.target.value)} required><option value="">انتخاب نقش</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></CrudField>
            <CrudField label="کد دستگاه حضور و غیاب (اختیاری)"><input value={deviceCode} onChange={(e) => setDeviceCode(e.target.value)} placeholder="مثلاً 12" dir="ltr" /></CrudField>
            <CrudField label="سوپروایزر مستقیم (اختیاری)"><select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}><option value="">بدون سوپروایزر مستقیم</option>{users.filter((u) => u.isActive && u.role?.code !== "CUSTOMER").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></CrudField>
            </CrudFormGrid>
            <button type="submit" className="crud-button crud-button--primary" disabled={saving}>{saving ? "در حال ایجاد..." : "ایجاد کاربر"}</button>
          </form>
        </CrudCard>
      </CrudColumns>

      {editingUser && <div className="crud-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingUser(null); }}>
        <section className="crud-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <header className="crud-modal__header"><div><h2 id="edit-user-title">ویرایش کاربر</h2><p>اطلاعات حساب کاربری را تغییر دهید.</p></div><button type="button" className="crud-modal__close" onClick={() => setEditingUser(null)} aria-label="بستن">×</button></header>
          <form onSubmit={saveEdit}>
            <div className="crud-form-grid">
              <CrudField label="نام و نام خانوادگی"><input value={editName} onChange={(e) => setEditName(e.target.value)} required /></CrudField>
              <CrudField label="نام کاربری"><input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} dir="ltr" required /></CrudField>
              <CrudField label="شماره موبایل (برای مشتری الزامی)"><input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} dir="ltr" /></CrudField>
              <CrudField label="رمز عبور جدید (اختیاری)"><input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="بدون تغییر خالی بگذارید" dir="ltr" autoComplete="new-password" /></CrudField>
              <CrudField label="نقش کاربر"><select value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} required><option value="">انتخاب نقش</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></CrudField>
              <CrudField label="کد دستگاه حضور و غیاب (اختیاری)"><input value={editDeviceCode} onChange={(e) => setEditDeviceCode(e.target.value)} placeholder="مثلاً 12" dir="ltr" /></CrudField>
              <CrudField label="سوپروایزر مستقیم (اختیاری)"><select value={editSupervisorId} onChange={(e) => setEditSupervisorId(e.target.value)}><option value="">بدون سوپروایزر مستقیم</option>{users.filter((u) => u.isActive && u.id !== editingUser.id && u.role?.code !== "CUSTOMER").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></CrudField>
            </div>
            <label className="crud-checkbox"><input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} /> حساب کاربر فعال باشد</label>
            {error && <div className="crud-alert crud-alert--error" role="alert">{error}</div>}
            <div className="crud-form-actions"><button type="button" className="crud-button crud-button--secondary" onClick={() => setEditingUser(null)}>انصراف</button><button type="submit" className="crud-button crud-button--primary" disabled={editSaving}>{editSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
          </form>
        </section>
      </div>}
    </CrudPage>
  );
}
