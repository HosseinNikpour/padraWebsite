"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
};

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: number;
  category: Category;
  sortOrder: number;
  isActive: boolean;
};

export default function MenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [itemsResponse, categoriesResponse] =
        await Promise.all([
          fetch("/api/menu/items"),
          fetch("/api/menu/categories"),
        ]);

      if (!itemsResponse.ok || !categoriesResponse.ok) {
        throw new Error();
      }

      const itemsData = await itemsResponse.json();
      const categoriesData = await categoriesResponse.json();

      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      alert("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setSortOrder("0");
    setIsActive(true);
    setImage(null);
  }

  function editItem(item: MenuItem) {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(String(item.price));
    setCategoryId(String(item.categoryId));
    setSortOrder(String(item.sortOrder));
    setIsActive(item.isActive);
    setImage(item.image || null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveItem() {
    if (!name.trim()) {
      alert("نام آیتم را وارد کنید");
      return;
    }

    if (!categoryId) {
      alert("دسته‌بندی را انتخاب کنید");
      return;
    }

    if (!price || Number(price) < 0) {
      alert("قیمت معتبر وارد کنید");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        categoryId: Number(categoryId),
        sortOrder: Number(sortOrder || 0),
        image,
        isActive,
      };

      const response = await fetch(
        editingId
          ? `/api/menu/items/${editingId}`
          : "/api/menu/items",
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
          data.error || "خطا در ذخیره آیتم"
        );
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره آیتم"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: MenuItem) {
    const confirmed = confirm(
      `آیا از حذف «${item.name}» مطمئن هستید؟`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/menu/items/${item.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در حذف آیتم"
        );
      }

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در حذف آیتم"
      );
    }
  }
  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("لطفاً یک فایل تصویری انتخاب کنید");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("حجم تصویر نباید بیشتر از ۵ مگابایت باشد");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/menu/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در آپلود تصویر"
        );
      }

      setImage(data.url);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در آپلود تصویر"
      );
    } finally {
      setUploading(false);
    }
  }
  const filteredItems = items.filter((item) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      item.name.toLowerCase().includes(searchText) ||
      (item.description || "")
        .toLowerCase()
        .includes(searchText);

    const matchesCategory =
      !categoryFilter ||
      String(item.categoryId) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="items-page" dir="rtl">
      {/* Header */}

      <div className="items-page-header">
        <div>
          <div className="breadcrumb">
            مدیریت منو / آیتم‌ها
          </div>

          <h1>آیتم‌های منو</h1>

          <p>
            محصولات و قیمت‌های منوی کافه را مدیریت کنید.
          </p>
        </div>

        <a
          href="/admin/menu"
          className="back-button"
        >
          ← بازگشت به منو
        </a>
      </div>

      {/* Form */}

      <div className="form-card">
        <div className="form-header">
          <div className="form-icon">
            {editingId ? "✎" : "+"}
          </div>

          <div>
            <h2>
              {editingId
                ? "ویرایش آیتم"
                : "آیتم جدید"}
            </h2>

            <p>
              {editingId
                ? "اطلاعات محصول را ویرایش کنید."
                : "یک محصول جدید به منوی کافه اضافه کنید."}
            </p>
          </div>
        </div>

        <div className="form-body">
          {/* Name */}

          <div className="field field-wide">
            <label>
              نام آیتم
              <span>*</span>
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="مثلاً لاته"
            />
          </div>

          {/* Category */}

          <div className="field">
            <label>
              دسته‌بندی
              <span>*</span>
            </label>

            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value)
              }
            >
              <option value="">
                انتخاب دسته‌بندی
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}

          <div className="field">
            <label>
              قیمت
              <span>*</span>
            </label>

            <div className="price-input">
              <input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="مثلاً 120000"
                min="0"
              />

              <span>تومان</span>
            </div>
          </div>

          {/* Sort */}

          <div className="field">
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

          {/* Description */}

          <div className="field field-full">
            <label>توضیحات</label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="توضیحات کوتاه درباره محصول..."
              rows={3}
            />
          </div>
          {/* image */}
          <div className="field field-full">
            <label>تصویر آیتم</label>

            <div className="image-upload-box">
              {image ? (
                <div className="image-preview">
                  <img
                    src={image}
                    alt={name || "تصویر آیتم"}
                  />

                  <div className="image-overlay">
                    <label className="change-image">
                      تغییر تصویر

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];

                          if (file) {
                            uploadImage(file);
                          }

                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => setImage(null)}
                    >
                      حذف تصویر
                    </button>
                  </div>
                </div>
              ) : (
                <label className="upload-placeholder">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        uploadImage(file);
                      }

                      e.currentTarget.value = "";
                    }}
                  />

                  <div className="upload-icon">
                    {uploading ? "..." : "↑"}
                  </div>

                  <strong>
                    {uploading
                      ? "در حال آپلود..."
                      : "انتخاب تصویر"}
                  </strong>

                  <span>
                    JPG، PNG یا WEBP — حداکثر ۵ مگابایت
                  </span>
                </label>
              )}
            </div>
          </div>



          {/* Active */}

          <div className="active-box">
            <div>
              <strong>وضعیت آیتم</strong>

              <span>
                {isActive
                  ? "این آیتم در منوی مشتری نمایش داده می‌شود."
                  : "این آیتم در منوی مشتری نمایش داده نمی‌شود."}
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

        <div className="form-actions">
          <button
            onClick={saveItem}
            disabled={saving}
            className="primary-button"
          >
            {saving
              ? "در حال ذخیره..."
              : editingId
                ? "ذخیره تغییرات"
                : "افزودن آیتم"}
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

      {/* Filters */}

      <div className="filters">
        <div className="search-box">
          <span>⌕</span>

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="جستجوی نام یا توضیحات..."
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
          className="filter-select"
        >
          <option value="">
            همه دسته‌بندی‌ها
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* List */}

      <div className="list-card">
        <div className="list-header">
          <div>
            <h2>لیست آیتم‌ها</h2>

            <p>
              نمایش{" "}
              {filteredItems.length.toLocaleString(
                "fa-IR"
              )}{" "}
              از{" "}
              {items.length.toLocaleString(
                "fa-IR"
              )}{" "}
              آیتم
            </p>
          </div>

          <div className="list-count">
            {filteredItems.length.toLocaleString(
              "fa-IR"
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>در حال دریافت اطلاعات...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              ☕
            </div>

            <h3>
              آیتمی پیدا نشد
            </h3>

            <p>
              اولین محصول منوی خود را ایجاد کنید.
            </p>
          </div>
        ) : (
          <div className="items-table">
            <div className="table-head">
              <div>محصول</div>
              <div>دسته‌بندی</div>
              <div>قیمت</div>
              <div>وضعیت</div>
              <div>عملیات</div>
            </div>

            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className="item-row"
              >
                {/* Product */}

                <div className="product-cell">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-icon">
                      ☕
                    </div>
                  )}

                  <div>
                    <strong>
                      {item.name}
                    </strong>

                    {item.description && (
                      <small>
                        {item.description}
                      </small>
                    )}

                    <em>
                      #{item.id}
                    </em>
                  </div>
                </div>

                {/* Category */}

                <div>
                  <span className="category-badge">
                    {item.category?.name}
                  </span>
                </div>

                {/* Price */}

                <div className="item-price">
                  {item.price.toLocaleString(
                    "fa-IR"
                  )}

                  <span>تومان</span>
                </div>

                {/* Status */}

                <div>
                  <span
                    className={
                      item.isActive
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    <span />
                    {item.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </span>
                </div>

                {/* Actions */}

                <div className="actions">
                  <button
                    onClick={() =>
                      editItem(item)
                    }
                    className="edit-button"
                  >
                    ویرایش
                  </button>

                  <button
                    onClick={() =>
                      deleteItem(item)
                    }
                    className="delete-button"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

     
    </div>
  );
}