"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  _count: {
    items: number;
  };
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);

      const response = await fetch("/api/menu/categories");

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setCategories(data);
    } catch (error) {
      console.error(error);
      alert("خطا در دریافت دسته‌بندی‌ها");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setSortOrder("0");
    setIsActive(true);
  }

  function editCategory(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setSortOrder(String(category.sortOrder));
    setIsActive(category.isActive);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCategory() {
    if (!name.trim()) {
      alert("نام دسته‌بندی را وارد کنید");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        sortOrder: Number(sortOrder || 0),
        isActive,
      };

      const response = await fetch(
        editingId
          ? `/api/menu/categories/${editingId}`
          : "/api/menu/categories",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در ذخیره دسته‌بندی"
        );
      }

      await loadCategories();
      resetForm();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره دسته‌بندی"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (category._count.items > 0) {
      alert(
        "این دسته‌بندی دارای آیتم است و قابل حذف نیست."
      );
      return;
    }

    const confirmed = confirm(
      `آیا از حذف «${category.name}» مطمئن هستید؟`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/menu/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در حذف دسته‌بندی"
        );
      }

      await loadCategories();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در حذف دسته‌بندی"
      );
    }
  }

  return (
    <div className="category-page" dir="rtl">
      {/* Header */}

      <div className="category-page-header">
        <div>
          <div className="category-breadcrumb">
            مدیریت منو / دسته‌بندی‌ها
          </div>

          <h1>دسته‌بندی‌های منو</h1>

          <p>
            دسته‌بندی‌های محصولات کافه را مدیریت کنید.
          </p>
        </div>

        <a
          href="/admin/menu"
          className="category-back-button"
        >
          ← بازگشت به منو
        </a>
      </div>

      {/* Form */}

      <div className="category-form-card">
        <div className="category-form-header">
          <div className="category-form-icon">
            {editingId ? "✎" : "+"}
          </div>

          <div>
            <h2>
              {editingId
                ? "ویرایش دسته‌بندی"
                : "دسته‌بندی جدید"}
            </h2>

            <p>
              {editingId
                ? "اطلاعات دسته‌بندی را ویرایش کنید."
                : "یک دسته‌بندی جدید برای منوی کافه ایجاد کنید."}
            </p>
          </div>
        </div>

        <div className="category-form-body">
          {/* Name */}

          <div className="form-field">
            <label>
              نام دسته‌بندی
              <span>*</span>
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="مثلاً نوشیدنی گرم"
            />
          </div>

          {/* Sort */}

          <div className="form-field small">
            <label>ترتیب نمایش</label>

            <input
              type="number"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value)
              }
              min="0"
            />

            <small>
              عدد کمتر، بالاتر نمایش داده می‌شود.
            </small>
          </div>

          {/* Active */}

          <div className="category-active-box">
            <div>
              <strong>وضعیت دسته‌بندی</strong>

              <span>
                {isActive
                  ? "این دسته‌بندی در منو نمایش داده می‌شود."
                  : "این دسته‌بندی در منو نمایش داده نمی‌شود."}
              </span>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) =>
                  setIsActive(e.target.checked)
                }
              />

              <span className="slider" />
            </label>
          </div>
        </div>

        {/* Actions */}

        <div className="category-form-actions">
          <button
            onClick={saveCategory}
            disabled={saving}
            className="primary-button"
          >
            {saving
              ? "در حال ذخیره..."
              : editingId
              ? "ذخیره تغییرات"
              : "ایجاد دسته‌بندی"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="secondary-button"
            >
              انصراف
            </button>
          )}
        </div>
      </div>

      {/* List */}

      <div className="category-list-card">
        <div className="category-list-header">
          <div>
            <h2>دسته‌بندی‌ها</h2>

            <p>
              {categories.length.toLocaleString(
                "fa-IR"
              )}{" "}
              دسته‌بندی ثبت شده
            </p>
          </div>

          <div className="category-count">
            {categories.length.toLocaleString(
              "fa-IR"
            )}
          </div>
        </div>

        {loading ? (
          <div className="category-loading">
            <div className="loading-spinner" />
            <span>در حال دریافت اطلاعات...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="category-empty">
            <div className="empty-icon">☰</div>

            <h3>
              هنوز دسته‌بندی‌ای وجود ندارد
            </h3>

            <p>
              اولین دسته‌بندی منوی خود را ایجاد کنید.
            </p>
          </div>
        ) : (
          <div className="category-table">
            <div className="category-table-head">
              <div>دسته‌بندی</div>
              <div>تعداد آیتم</div>
              <div>ترتیب</div>
              <div>وضعیت</div>
              <div>عملیات</div>
            </div>

            {categories.map((category, index) => (
              <div
                key={category.id}
                className="category-row"
              >
                <div className="category-name-cell">
                  <div className="category-number">
                    {(index + 1).toLocaleString(
                      "fa-IR"
                    )}
                  </div>

                  <div>
                    <strong>
                      {category.name}
                    </strong>

                    <small>
                      شناسه #{category.id}
                    </small>
                  </div>
                </div>

                <div>
                  <span className="item-count">
                    {category._count.items.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    آیتم
                  </span>
                </div>

                <div className="sort-value">
                  {category.sortOrder.toLocaleString(
                    "fa-IR"
                  )}
                </div>

                <div>
                  <span
                    className={
                      category.isActive
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    <span />
                    {category.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </span>
                </div>

                <div className="row-actions">
                  <button
                    onClick={() =>
                      editCategory(category)
                    }
                    className="edit-button"
                  >
                    ویرایش
                  </button>

                  <button
                    onClick={() =>
                      deleteCategory(category)
                    }
                    className="delete-button"
                    disabled={
                      category._count.items > 0
                    }
                    title={
                      category._count.items > 0
                        ? "ابتدا آیتم‌های این دسته را حذف کنید."
                        : ""
                    }
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .category-page {
          max-width: 1150px;
          margin: 0 auto;
          padding: 10px 0 60px;
        }

        .category-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .category-breadcrumb {
          color: #8a9aaf;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .category-page-header h1 {
          margin: 0;
          color: #123e73;
          font-size: 27px;
          font-weight: 900;
        }

        .category-page-header p {
          margin: 8px 0 0;
          color: #7b8da3;
          font-size: 13px;
        }

        .category-back-button {
          text-decoration: none;
          color: #123e73;
          background: #fff;
          border: 1px solid #dbe6f1;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s;
        }

        .category-back-button:hover {
          background: #123e73;
          color: white;
          border-color: #123e73;
        }

        .category-form-card,
        .category-list-card {
          background: white;
          border: 1px solid #e3ebf4;
          border-radius: 18px;
          box-shadow:
            0 6px 25px rgba(18, 62, 115, 0.055);
          overflow: hidden;
        }

        .category-form-card {
          margin-bottom: 25px;
        }

        .category-form-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 22px 25px;
          border-bottom: 1px solid #edf2f7;
          background: linear-gradient(
            90deg,
            #ffffff,
            #f8fbff
          );
        }

        .category-form-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          background: #eaf3fc;
          color: #123e73;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          font-weight: 900;
        }

        .category-form-header h2,
        .category-list-header h2 {
          margin: 0;
          color: #123e73;
          font-size: 17px;
          font-weight: 900;
        }

        .category-form-header p,
        .category-list-header p {
          margin: 5px 0 0;
          color: #8a9aaf;
          font-size: 11px;
        }

        .category-form-body {
          padding: 25px;
          display: grid;
          grid-template-columns:
            minmax(250px, 2fr)
            minmax(160px, 1fr);
          gap: 20px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .form-field label {
          color: #344b65;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .form-field label span {
          color: #e14d5a;
          margin-right: 3px;
        }

        .form-field input {
          height: 45px;
          box-sizing: border-box;
          border: 1px solid #dce6f0;
          border-radius: 10px;
          padding: 0 13px;
          color: #1f344d;
          background: #fff;
          outline: none;
          font-family: inherit;
          font-size: 13px;
          transition: 0.2s;
        }

        .form-field input:focus {
          border-color: #123e73;
          box-shadow:
            0 0 0 3px rgba(18, 62, 115, 0.08);
        }

        .form-field small {
          color: #94a3b8;
          font-size: 10px;
          margin-top: 6px;
        }

        .category-active-box {
          grid-column: 1 / -1;
          background: #f7faff;
          border: 1px solid #e4edf6;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .category-active-box strong {
          display: block;
          color: #344b65;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .category-active-box span:not(.slider) {
          color: #8a9aaf;
          font-size: 10px;
        }

        .switch {
          position: relative;
          width: 48px;
          height: 26px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          inset: 0;
          cursor: pointer;
          background: #cbd5e1;
          border-radius: 30px;
          transition: 0.25s;
        }

        .slider:before {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          right: 3px;
          top: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.25s;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .switch input:checked + .slider {
          background: #123e73;
        }

        .switch input:checked + .slider:before {
          transform: translateX(-22px);
        }

        .category-form-actions {
          padding: 18px 25px;
          background: #fafcff;
          border-top: 1px solid #edf2f7;
          display: flex;
          gap: 10px;
        }

        .primary-button,
        .secondary-button {
          border: 0;
          border-radius: 10px;
          padding: 11px 20px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }

        .primary-button {
          background: #123e73;
          color: white;
        }

        .primary-button:hover:not(:disabled) {
          background: #0d315d;
          transform: translateY(-1px);
        }

        .primary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .secondary-button {
          background: #edf2f7;
          color: #52657b;
        }

        .secondary-button:hover {
          background: #e2e8f0;
        }

        .category-list-header {
          padding: 20px 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #edf2f7;
        }

        .category-count {
          min-width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eaf3fc;
          color: #123e73;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
        }

        .category-table-head,
        .category-row {
          display: grid;
          grid-template-columns:
            2.2fr 1fr 0.7fr 1fr 1.4fr;
          align-items: center;
          gap: 15px;
          padding: 0 25px;
        }

        .category-table-head {
          height: 43px;
          background: #f8fafc;
          color: #8a9aaf;
          font-size: 10px;
          font-weight: 800;
          border-bottom: 1px solid #edf2f7;
        }

        .category-row {
          min-height: 72px;
          border-bottom: 1px solid #edf2f7;
          color: #53677d;
          font-size: 12px;
        }

        .category-row:last-child {
          border-bottom: 0;
        }

        .category-row:hover {
          background: #fbfdff;
        }

        .category-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .category-number {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          background: #f0f6fc;
          color: #123e73;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .category-name-cell strong {
          display: block;
          color: #123e73;
          font-size: 13px;
          font-weight: 800;
        }

        .category-name-cell small {
          display: block;
          color: #a0adbc;
          font-size: 9px;
          margin-top: 4px;
        }

        .item-count {
          color: #123e73;
          background: #f0f6fc;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 700;
        }

        .sort-value {
          color: #64748b;
          font-weight: 700;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
        }

        .status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status.active {
          color: #18794e;
          background: #eaf8f0;
        }

        .status.active span {
          background: #25a865;
        }

        .status.inactive {
          color: #a34b52;
          background: #fff0f1;
        }

        .status.inactive span {
          background: #d65b64;
        }

        .row-actions {
          display: flex;
          gap: 7px;
        }

        .edit-button,
        .delete-button {
          border-radius: 8px;
          padding: 7px 11px;
          background: white;
          font-family: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .edit-button {
          border: 1px solid #d9e5f0;
          color: #123e73;
        }

        .edit-button:hover {
          background: #123e73;
          color: white;
          border-color: #123e73;
        }

        .delete-button {
          border: 1px solid #f2d3d5;
          color: #b44c54;
        }

        .delete-button:hover:not(:disabled) {
          background: #fff0f1;
        }

        .delete-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .category-loading,
        .category-empty {
          min-height: 230px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #8a9aaf;
        }

        .category-loading {
          gap: 12px;
          font-size: 12px;
        }

        .loading-spinner {
          width: 25px;
          height: 25px;
          border: 3px solid #dce8f3;
          border-top-color: #123e73;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          border-radius: 16px;
          background: #edf5fc;
          color: #123e73;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 15px;
        }

        .category-empty h3 {
          margin: 0;
          color: #123e73;
          font-size: 14px;
        }

        .category-empty p {
          margin: 7px 0 0;
          font-size: 11px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 800px) {
          .category-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .category-form-body {
            grid-template-columns: 1fr;
          }

          .category-table-head {
            display: none;
          }

          .category-row {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 18px;
          }

          .category-name-cell {
            grid-column: 1 / -1;
          }

          .row-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}