"use client";

import { useFeedback } from "@/components/ui/Feedback";
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

const permissionGroupOrder = [
  { key: "games", title: "بازی‌ها" },
  { key: "schedules", title: "زمان‌بندی" },
  { key: "bookings", title: "رزروها" },
  { key: "events", title: "رویدادها" },
  { key: "menu", title: "منوی کافه" },
  { key: "users", title: "کاربران و پرسنل" },
  { key: "leave", title: "مرخصی و تأییدها" },
  { key: "shifts", title: "شیفت‌ها و جابه‌جایی شیفت" },
  { key: "attendance", title: "حضور و غیاب" },
  { key: "roles", title: "نقش‌ها و دسترسی‌ها" },
];

function getPermissionGroupKey(code: string) {
  const separatorIndex = code.indexOf(".");
  return separatorIndex === -1 ? code : code.slice(0, separatorIndex);
}


export default function RolesPage() {
    const { confirm: confirmDialog, toast } = useFeedback();
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
  const [syncing, setSyncing] = useState(false);
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

  const groupedPermissions = (() => {
    const groups = new Map<string, Permission[]>();

    for (const permission of permissions) {
      const key = getPermissionGroupKey(permission.code);
      const current = groups.get(key) ?? [];
      current.push(permission);
      groups.set(key, current);
    }

    const knownGroups = permissionGroupOrder
      .filter((group) => (groups.get(group.key)?.length ?? 0) > 0)
      .map((group) => ({
        key: group.key,
        title: group.title,
        permissions: (groups.get(group.key) ?? []).sort((a, b) => a.id - b.id),
      }));

    const knownKeys = new Set(permissionGroupOrder.map((group) => group.key));
    const otherGroups = Array.from(groups.entries())
      .filter(([key]) => !knownKeys.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        title: `سایر دسترسی‌ها (${key})`,
        permissions: items.sort((a, b) => a.id - b.id),
      }));

    return [...knownGroups, ...otherGroups];
  })();

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

  async function syncStaffPermissions() {
    const confirmed = await confirmDialog("دسترسی‌های پایه مرخصی، شیفت و حضور و غیاب اضافه و با نقش‌های پیش‌فرض همگام‌سازی شوند؟ دسترسی‌های فعلی حذف نمی‌شوند.");
    if (!confirmed) return;
    try {
      setSyncing(true);
      setError("");
      setSuccess("");
      const response = await fetch("/api/roles/sync-permissions", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "همگام‌سازی دسترسی‌ها ناموفق بود");
      setSuccess("دسترسی‌های پرسنلی اضافه و با نقش‌های پیش‌فرض همگام شدند.");
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : "خطا در همگام‌سازی دسترسی‌ها");
    } finally {
      setSyncing(false);
    }
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

        <div className="roles-header-actions">
          <button type="button" className="roles-sync-button" onClick={syncStaffPermissions} disabled={syncing}>
            {syncing ? "در حال همگام‌سازی..." : "افزودن دسترسی‌های پرسنلی"}
          </button>
          <div className="roles-count">
            <span>{roles.length}</span>
            نقش فعال
          </div>
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
                  {selectedRole.code === "ADMIN" && (
                    <span className="roles-admin-note">نقش مدیر سیستم دسترسی کامل دارد و قابل ویرایش نیست.</span>
                  )}
                  <button
                    type="button"
                    onClick={enableAll}
                    className="permission-action"
                    disabled={selectedRole.code === "ADMIN"}
                  >
                    فعال کردن همه
                  </button>

                  <button
                    type="button"
                    onClick={disableAll}
                    className="permission-action"
                    disabled={selectedRole.code === "ADMIN"}
                  >
                    حذف همه
                  </button>
                </div>

              </div>

              <div className="permission-groups">

                {groupedPermissions.map((group) => (
                  <div key={group.key} className="permission-group">
                    <div className="permission-group-title">
                      {group.title}
                      <span className="permission-group-count">{group.permissions.length}</span>
                    </div>

                    <div className="permission-list">
                      {group.permissions.map((permission) => {
                        const active = hasPermission(permission.id);

                        return (
                          <button
                            key={permission.id}
                            type="button"
                            className={`permission-item ${active ? "active" : ""}`}
                            onClick={() => togglePermission(permission.id)}
                            aria-pressed={active}
                            disabled={selectedRole.code === "ADMIN"}
                          >
                            <div className={`permission-checkbox ${active ? "checked" : ""}`}>
                              {active ? "✓" : ""}
                            </div>

                            <div className="permission-info">
                              <strong>{permission.name}</strong>
                              <small>{permission.code}</small>
                            </div>

                            {permission.description && (
                              <div className="permission-description">
                                {permission.description}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {permissions.length === 0 && (
                  <div className="roles-empty">
                    هیچ دسترسی فعالی در دیتابیس تعریف نشده است.
                  </div>
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
                  disabled={saving || selectedRole.code === "ADMIN"}
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