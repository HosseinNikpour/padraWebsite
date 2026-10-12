"use client";

import { FormEvent, useEffect, useState } from "react";
import "./users.css";

type Role = { id: number; name: string; code: string };
type User = {
  id: number;
  name: string;
  username: string;
  isActive: boolean;
  role: Role;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
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
      setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      setRoles(Array.isArray(rolesData) ? rolesData : rolesData.roles || []);
      const availableRoles = Array.isArray(rolesData) ? rolesData : rolesData.roles || [];
      if (!roleId && availableRoles.length) setRoleId(String(availableRoles[0].id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim() || !username.trim() || !password || !roleId) {
      setError("تمام اطلاعات کاربر را وارد کنید");
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), username: username.trim(), password, roleId: Number(roleId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ایجاد کاربر ناموفق بود");
      setSuccess("کاربر با موفقیت ایجاد شد");
      setName(""); setUsername(""); setPassword("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ایجاد کاربر");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(user: User) {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditRoleId(String((user as User & { roleId?: number }).roleId ?? user.role?.id ?? ""));
    setEditPassword("");
    setEditIsActive(user.isActive);
    setError("");
    setSuccess("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setError("");
    setSuccess("");
    if (!editName.trim() || !editUsername.trim() || !editRoleId) {
      setError("نام، نام کاربری و نقش را وارد کنید.");
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    try {
      setEditSaving(true);
      const payload: Record<string, unknown> = {
        id: editingUser.id,
        name: editName.trim(),
        username: editUsername.trim(),
        roleId: Number(editRoleId),
        isActive: editIsActive,
      };
      if (editPassword) payload.password = editPassword;
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ویرایش کاربر ناموفق بود");
      setEditingUser(null);
      setSuccess("اطلاعات کاربر ویرایش شد.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ویرایش کاربر");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`کاربر «${user.name}» حذف شود؟`)) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "حذف کاربر ناموفق بود");
      setSuccess("کاربر حذف شد.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف کاربر");
    }
  }

  return (
    <main className="users-admin">
      <header className="users-header">
        <div>
          <span>PADRA ADMIN</span>
          <h1>مدیریت کاربران</h1>
          <p>کاربران سامانه و نقش‌های دسترسی را مدیریت کنید.</p>
        </div>
        <div className="users-count">
          <strong>{users.length}</strong>
          <span>کاربر</span>
        </div>
      </header>

      <div className="users-content">
        <section className="users-list-section">
          <div className="users-section-header">
            <div>
              <h2>کاربران ثبت‌شده</h2>
              <p>فهرست کاربران و نقش‌های تعریف‌شده در سامانه</p>
            </div>
            <button type="button" className="users-refresh-button" onClick={() => void loadData()} disabled={loading}>
              {loading ? "در حال بارگذاری..." : "بروزرسانی فهرست"}
            </button>
          </div>
          {loading ? <div className="users-empty-box">در حال دریافت کاربران...</div> : users.length === 0 ? (
            <div className="users-empty-box">هنوز کاربری ثبت نشده است.</div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead><tr><th>کاربر</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                <tbody>{users.map((user) => (
                  <tr key={user.id}>
                    <td><div className="users-person">
                      {/* <div className="users-avatar">{user.name?.charAt(0)?.toUpperCase() || "ک"}</div> */}
                      <div><strong>{user.name}</strong><small>شناسه #{user.id}</small></div>
                    </div></td>
                    <td><span className="users-username" dir="ltr">{user.username}</span></td>
                    <td><span className="users-role">{user.role?.name || "بدون نقش"}</span></td>
                    <td><span className={`users-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "فعال" : "غیرفعال"}</span></td>
                    <td><div className="users-row-actions">
                      <button type="button" className="users-edit-button" onClick={() => startEditing(user)}>ویرایش</button>
                      <button type="button" className="users-delete-button" onClick={() => void deleteUser(user)}>حذف</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="users-form-card">
          <div className="users-section-header">
            <div><h2>ایجاد کاربر جدید</h2><p>اطلاعات کاربر جدید را وارد کنید.</p></div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="users-form-grid">
              <div className="users-field"><label htmlFor="user-name">نام و نام خانوادگی</label><input id="user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً حسین نیکپور" autoComplete="name" /></div>
              <div className="users-field"><label htmlFor="user-username">نام کاربری</label><input id="user-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="username" /></div>
              <div className="users-field"><label htmlFor="user-password">رمز عبور</label><input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="حداقل ۸ کاراکتر" dir="ltr" autoComplete="new-password" /></div>
              <div className="users-field"><label htmlFor="user-role">نقش کاربر</label><select id="user-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">انتخاب نقش</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
            </div>
            {error && <div className="users-message error" role="alert">{error}</div>}
            {success && <div className="users-message success" role="status">{success}</div>}
            <div className="users-form-actions"><button type="submit" className="users-save-button" disabled={saving}>{saving ? "در حال ایجاد..." : "ایجاد کاربر"}</button></div>
          </form>
        </section>
      </div>

      {editingUser && (
        <div className="users-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingUser(null); }}>
          <section className="users-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="users-section-header">
              <div><h2 id="edit-user-title">ویرایش کاربر</h2><p>اطلاعات حساب کاربری را تغییر دهید.</p></div>
              <button type="button" className="users-modal-close" onClick={() => setEditingUser(null)} aria-label="بستن">×</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="users-form-grid">
                <div className="users-field"><label htmlFor="edit-user-name">نام و نام خانوادگی</label><input id="edit-user-name" value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
                <div className="users-field"><label htmlFor="edit-user-username">نام کاربری</label><input id="edit-user-username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} dir="ltr" required /></div>
                <div className="users-field"><label htmlFor="edit-user-password">رمز عبور جدید (اختیاری)</label><input id="edit-user-password" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="بدون تغییر خالی بگذارید" dir="ltr" autoComplete="new-password" /></div>
                <div className="users-field"><label htmlFor="edit-user-role">نقش کاربر</label><select id="edit-user-role" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} required><option value="">انتخاب نقش</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
              </div>
              <label className="users-active-toggle"><input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} /> حساب کاربر فعال باشد</label>
              {error && <div className="users-message error" role="alert">{error}</div>}
              <div className="users-form-actions"><button type="button" className="users-refresh-button" onClick={() => setEditingUser(null)}>انصراف</button><button type="submit" className="users-save-button" disabled={editSaving}>{editSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
