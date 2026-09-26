"use client";

import { useEffect, useState } from "react";

import "./roles.css";

type Permission = {
  id: number;
  name: string;
  code: string;
  description: string | null;
};

type Role = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  permissions: {
    permission: Permission;
  }[];
};

const permissionGroups = [
  {
    title: "بازی‌ها",
    permissions: [
      "games.view",
      "games.manage",
    ],
  },
  {
    title: "زمان‌بندی",
    permissions: [
      "schedules.view",
      "schedules.manage",
    ],
  },
  {
    title: "رزروها",
    permissions: [
      "bookings.view",
      "bookings.manage",
    ],
  },
  {
    title: "رویدادها",
    permissions: [
      "events.view",
      "events.manage",
    ],
  },
  {
    title: "منوی کافه",
    permissions: [
      "menu.view",
      "menu.manage",
    ],
  },
  {
    title: "کاربران",
    permissions: [
      "users.view",
      "users.manage",
    ],
  },
  {
    title: "نقش‌ها و دسترسی‌ها",
    permissions: [
      "roles.view",
      "roles.manage",
    ],
  },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<
    Permission[]
  >([]);

  const [selectedRoleId, setSelectedRoleId] =
    useState<number | null>(null);

  const [selectedPermissions, setSelectedPermissions] =
    useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRole = roles.find(
    (role) => role.id === selectedRoleId
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/roles");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در دریافت نقش‌ها"
        );
      }

      setRoles(data.roles || []);
      setPermissions(data.permissions || []);

      if (
        selectedRoleId === null &&
        data.roles?.length > 0
      ) {
        setSelectedRoleId(data.roles[0].id);
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

  useEffect(() => {
    if (!selectedRole) {
      setSelectedPermissions(new Set());
      return;
    }

    setSelectedPermissions(
      new Set(
        selectedRole.permissions.map(
          (item) => item.permission.id
        )
      )
    );
  }, [selectedRoleId, roles]);

  function selectRole(roleId: number) {
    setSelectedRoleId(roleId);
    setSuccess("");
    setError("");
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissions((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });

    setSuccess("");
  }

  function getPermission(
    code: string
  ) {
    return permissions.find(
      (permission) =>
        permission.code === code
    );
  }

  function hasPermission(
    permissionId: number
  ) {
    return selectedPermissions.has(permissionId);
  }

  function enableAll() {
    setSelectedPermissions(
      new Set(permissions.map((item) => item.id))
    );

    setSuccess("");
  }

  function disableAll() {
    setSelectedPermissions(new Set());
    setSuccess("");
  }

  async function savePermissions() {
    if (!selectedRole) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/roles/${selectedRole.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissionIds:
              Array.from(selectedPermissions),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "ذخیره دسترسی‌ها ناموفق بود"
        );
      }

      setSuccess(
        "دسترسی‌های نقش با موفقیت ذخیره شد."
      );

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره دسترسی‌ها"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="roles-loading">
        در حال دریافت اطلاعات...
      </div>
    );
  }

  return (
    <div className="roles-page">

      {/* Header */}
      <div className="roles-page-header">
        <div>
          <div className="roles-page-label">
            ROLE & PERMISSION MANAGEMENT
          </div>

          <h1>
            نقش‌ها و دسترسی‌ها
          </h1>

          <p>
            سطح دسترسی کاربران سامانه را بر اساس نقش
            مدیریت کنید.
          </p>
        </div>

        <div className="roles-count">
          <span>{roles.length}</span>
          نقش فعال
        </div>
      </div>

      {error && (
        <div className="roles-message roles-message-error">
          {error}
        </div>
      )}

      {success && (
        <div className="roles-message roles-message-success">
          {success}
        </div>
      )}

      <div className="roles-layout">

        {/* Roles */}
        <section className="roles-card roles-list-card">

          <div className="roles-card-header">
            <div>
              <h2>نقش‌ها</h2>
              <p>
                نقش موردنظر را انتخاب کنید.
              </p>
            </div>
          </div>

          <div className="roles-list">

            {roles.map((role) => {
              const permissionCount =
                role.permissions.length;

              const isSelected =
                role.id === selectedRoleId;

              return (
                <button
                  key={role.id}
                  type="button"
                  className={`role-item ${
                    isSelected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectRole(role.id)
                  }
                >
                  <div className="role-item-icon">
                    {role.code === "ADMIN"
                      ? "★"
                      : "♙"}
                  </div>

                  <div className="role-item-content">
                    <strong>
                      {role.name}
                    </strong>

                    <small>
                      {role.description ||
                        role.code}
                    </small>
                  </div>

                  <div className="role-item-count">
                    {permissionCount}
                  </div>
                </button>
              );
            })}

          </div>
        </section>

        {/* Permissions */}
        <section className="roles-card permissions-card">

          {selectedRole ? (
            <>
              <div className="permissions-header">

                <div>
                  <div className="permissions-role-label">
                    ROLE
                  </div>

                  <h2>
                    {selectedRole.name}
                  </h2>

                  <p>
                    {selectedRole.description ||
                      "مدیریت دسترسی‌های این نقش"}
                  </p>
                </div>

                <div className="permissions-actions">
                  <button
                    type="button"
                    onClick={enableAll}
                    className="permission-action"
                  >
                    فعال کردن همه
                  </button>

                  <button
                    type="button"
                    onClick={disableAll}
                    className="permission-action"
                  >
                    حذف همه
                  </button>
                </div>

              </div>

              <div className="permission-groups">

                {permissionGroups.map(
                  (group) => (
                    <div
                      key={group.title}
                      className="permission-group"
                    >
                      <div className="permission-group-title">
                        {group.title}
                      </div>

                      <div className="permission-list">

                        {group.permissions.map(
                          (code) => {
                            const permission =
                              getPermission(
                                code
                              );

                            if (!permission) {
                              return null;
                            }

                            const active =
                              hasPermission(
                                permission.id
                              );

                            return (
                              <button
                                key={
                                  permission.id
                                }
                                type="button"
                                className={`permission-item ${
                                  active
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() =>
                                  togglePermission(
                                    permission.id
                                  )
                                }
                              >

                                <div
                                  className={`permission-checkbox ${
                                    active
                                      ? "checked"
                                      : ""
                                  }`}
                                >
                                  {active
                                    ? "✓"
                                    : ""}
                                </div>

                                <div className="permission-info">
                                  <strong>
                                    {
                                      permission.name
                                    }
                                  </strong>

                                  <small>
                                    {
                                      permission.code
                                    }
                                  </small>
                                </div>

                                <div className="permission-description">
                                  {
                                    permission.description
                                  }
                                </div>

                              </button>
                            );
                          }
                        )}

                      </div>
                    </div>
                  )
                )}

              </div>

              <div className="permissions-footer">

                <div>
                  <strong>
                    {selectedPermissions.size}
                  </strong>

                  <span>
                    دسترسی فعال
                  </span>
                </div>

                <button
                  type="button"
                  className="roles-save-button"
                  onClick={savePermissions}
                  disabled={saving}
                >
                  {saving
                    ? "در حال ذخیره..."
                    : "ذخیره دسترسی‌ها"}
                </button>

              </div>
            </>
          ) : (
            <div className="roles-empty">
              یک نقش را انتخاب کنید.
            </div>
          )}

        </section>

      </div>
    </div>
  );
}