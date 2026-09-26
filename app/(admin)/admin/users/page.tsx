"use client";

import { FormEvent, useEffect, useState } from "react";

import "./users.css";

type Role = {
  id: number;
  name: string;
  code: string;
};

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

  async function loadData() {
    try {
      setLoading(true);

      const [usersResponse, rolesResponse] =
        await Promise.all([
          fetch("/api/users"),
          fetch("/api/roles"),
        ]);

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();

      if (!usersResponse.ok) {
        throw new Error(
          usersData.error || "خطا در دریافت کاربران"
        );
      }

      if (!rolesResponse.ok) {
        throw new Error(
          rolesData.error || "خطا در دریافت نقش‌ها"
        );
      }

      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);

      if (
        !roleId &&
        rolesData.roles?.length > 0
      ) {
        setRoleId(String(rolesData.roles[0].id));
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت اطلاعات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name || !username || !password || !roleId) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          username,
          password,
          roleId: Number(roleId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "ایجاد کاربر ناموفق بود"
        );
      }

      setSuccess("کاربر با موفقیت ایجاد شد");

      setName("");
      setUsername("");
      setPassword("");

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطا در ایجاد کاربر"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="users-page">

      {/* Header */}
      <div className="users-page-header">
        <div>
          <div className="users-page-label">
            USER MANAGEMENT
          </div>

          <h1>مدیریت کاربران</h1>

          <p>
            کاربران سامانه و سطح دسترسی آن‌ها را مدیریت کنید.
          </p>
        </div>

        <div className="users-count">
          <span>{users.length}</span>
          کاربر
        </div>
      </div>

      <div className="users-layout">

        {/* Create User */}
        <section className="users-card users-create-card">

          <div className="users-card-header">
            <div>
              <h2>ایجاد کاربر جدید</h2>
              <p>
                اطلاعات کاربر جدید را وارد کنید.
              </p>
            </div>

            <div className="users-card-icon">
              +
            </div>
          </div>

          <form
            className="users-form"
            onSubmit={handleSubmit}
          >

            <div className="users-form-group">
              <label>نام و نام خانوادگی</label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="مثلاً حسین نیکپور"
              />
            </div>

            <div className="users-form-group">
              <label>نام کاربری</label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="username"
                dir="ltr"
              />
            </div>

            <div className="users-form-group">
              <label>رمز عبور</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="حداقل ۸ کاراکتر"
                dir="ltr"
              />
            </div>

            <div className="users-form-group">
              <label>نقش کاربر</label>

              <select
                value={roleId}
                onChange={(event) =>
                  setRoleId(event.target.value)
                }
              >
                <option value="">
                  انتخاب نقش
                </option>

                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="users-message users-message-error">
                {error}
              </div>
            )}

            {success && (
              <div className="users-message users-message-success">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="users-submit-button"
              disabled={saving}
            >
              {saving
                ? "در حال ایجاد..."
                : "ایجاد کاربر"}
            </button>

          </form>
        </section>

        {/* Users List */}
        <section className="users-card users-list-card">

          <div className="users-card-header">
            <div>
              <h2>کاربران سامانه</h2>
              <p>
                لیست کاربران و نقش‌های تعریف‌شده
              </p>
            </div>
          </div>

          {loading ? (
            <div className="users-loading">
              در حال دریافت اطلاعات...
            </div>
          ) : users.length === 0 ? (
            <div className="users-empty">
              هنوز کاربری ثبت نشده است.
            </div>
          ) : (
            <div className="users-table-wrapper">

              <table className="users-table">

                <thead>
                  <tr>
                    <th>کاربر</th>
                    <th>نام کاربری</th>
                    <th>نقش</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>

                      <td>
                        <div className="user-name-cell">

                          <div className="user-avatar">
                            {user.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {user.name}
                            </strong>

                            <small>
                              شناسه #{user.id}
                            </small>
                          </div>

                        </div>
                      </td>

                      <td>
                        <span className="username">
                          {user.username}
                        </span>
                      </td>

                      <td>
                        <span className="user-role">
                          {user.role.name}
                        </span>
                      </td>

                      <td>
                        {user.isActive ? (
                          <span className="user-status active">
                            فعال
                          </span>
                        ) : (
                          <span className="user-status inactive">
                            غیرفعال
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </div>
  );
}