"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import "./games.css";

type Game = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  duration: string;
  capacity: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export default function GamesAdminPage() {
  const [games, setGames] = useState<Game[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    try {
      setLoading(true);

      const response = await fetch("/api/games");

      if (!response.ok) {
        throw new Error();
      }

      const data: Game[] = await response.json();

      setGames(data);
    } catch (error) {
      console.error("LOAD GAMES ERROR:", error);
      alert("خطا در دریافت بازی‌ها");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);

    setName("");
    setDescription("");
    setDuration("");
    setCapacity("");
    setPrice("");
    setSortOrder("0");
    setIsActive(true);
    setImage("");
  }

  function editGame(game: Game) {
    setEditingId(game.id);

    setName(game.name);
    setDescription(game.description ?? "");
    setDuration(game.duration);
    setCapacity(game.capacity);
    setPrice(String(game.price));
    setSortOrder(String(game.sortOrder));
    setIsActive(game.isActive);
    setImage(game.image ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/menu/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در آپلود تصویر"
        );
      }

      setImage(data.url);
    } catch (error) {
      console.error("GAME IMAGE UPLOAD ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در آپلود تصویر"
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      alert("نام بازی را وارد کنید");
      return;
    }

    if (!duration.trim()) {
      alert("مدت بازی را وارد کنید");
      return;
    }

    if (!capacity.trim()) {
      alert("ظرفیت بازی را وارد کنید");
      return;
    }

    const numericPrice = Number(price || 0);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      alert("قیمت معتبر نیست");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        duration: duration.trim(),
        capacity: capacity.trim(),
        price: numericPrice,
        sortOrder: Number(sortOrder || 0),
        isActive,
        image: image || null,
      };

      const response = await fetch(
        editingId
          ? `/api/games/${editingId}`
          : "/api/games",
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
          data.error || "خطا در ذخیره بازی"
        );
      }

      await loadGames();

      resetForm();
    } catch (error) {
      console.error("SAVE GAME ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره بازی"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGame(id: number) {
    const confirmed = confirm(
      "آیا از حذف این بازی مطمئن هستید؟"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/games/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "خطا در حذف بازی"
        );
      }

      await loadGames();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("DELETE GAME ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "خطا در حذف بازی"
      );
    }
  }

  async function toggleActive(game: Game) {
    try {
      const response = await fetch(
        `/api/games/${game.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: game.name,
            description: game.description ?? "",
            duration: game.duration,
            capacity: game.capacity,
            price: game.price,
            sortOrder: game.sortOrder,
            isActive: !game.isActive,
            image: game.image,
          }),
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      await loadGames();
    } catch (error) {
      console.error("TOGGLE GAME ERROR:", error);
      alert("خطا در تغییر وضعیت بازی");
    }
  }

  return (
    <main className="games-admin">

      <div className="games-header">
        <div>
          <span>PADRA ADMIN</span>

          <h1>مدیریت بازی‌ها</h1>

          <p>
            بازی‌های مجموعه را اضافه، ویرایش و مدیریت کنید.
          </p>
        </div>

        <div className="games-count">
          <strong>{games.length}</strong>
          <span>بازی</span>
        </div>
      </div>


      <section className="game-form-card">

        <div className="form-title">
          <div>
            <h2>
              {editingId
                ? "ویرایش بازی"
                : "افزودن بازی جدید"}
            </h2>

            <p>
              اطلاعات بازی را وارد کنید.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="cancel-button"
              onClick={resetForm}
            >
              انصراف از ویرایش
            </button>
          )}
        </div>


        <form onSubmit={handleSubmit}>

          <div className="form-grid">

            <div className="form-field">
              <label>نام بازی</label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="مثلاً Laser Tag"
              />
            </div>


            <div className="form-field">
              <label>مدت بازی</label>

              <input
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value)
                }
                placeholder="مثلاً 20 دقیقه"
              />
            </div>


            <div className="form-field">
              <label>ظرفیت</label>

              <input
                value={capacity}
                onChange={(e) =>
                  setCapacity(e.target.value)
                }
                placeholder="مثلاً 8 تا 10 نفر"
              />
            </div>


            <div className="form-field">
              <label>قیمت</label>

              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="مثلاً 450000"
              />
            </div>


            <div className="form-field">
              <label>ترتیب نمایش</label>

              <input
                type="number"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value)
                }
              />
            </div>


            <div className="form-field">
              <label>وضعیت</label>

              <button
                type="button"
                className={`status-toggle ${
                  isActive ? "active" : ""
                }`}
                onClick={() =>
                  setIsActive(!isActive)
                }
              >
                <span />

                {isActive
                  ? "فعال"
                  : "غیرفعال"}
              </button>
            </div>


            <div className="form-field full">
              <label>توضیحات</label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="توضیح کوتاهی درباره بازی..."
                rows={4}
              />
            </div>


            <div className="form-field full">
              <label>تصویر بازی</label>

              <div className="image-upload">

                {image && (
                  <div className="image-preview">
                    <img
                      src={image}
                      alt={name || "بازی"}
                    />
                  </div>
                )}

                <label className="upload-button">

                  {uploading
                    ? "در حال آپلود..."
                    : image
                    ? "تغییر تصویر"
                    : "انتخاب تصویر"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadImage}
                    disabled={uploading}
                    hidden
                  />
                </label>

              </div>
            </div>

          </div>


          <div className="form-actions">

            <button
              type="submit"
              className="save-button"
              disabled={saving || uploading}
            >
              {saving
                ? "در حال ذخیره..."
                : editingId
                ? "ذخیره تغییرات"
                : "افزودن بازی"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                لغو
              </button>
            )}

          </div>

        </form>

      </section>


      <section className="games-list-section">

        <div className="list-header">
          <div>
            <h2>بازی‌های ثبت‌شده</h2>
            <p>
              لیست بازی‌های موجود در سایت
            </p>
          </div>
        </div>


        {loading ? (
          <div className="empty-box">
            در حال دریافت بازی‌ها...
          </div>
        ) : games.length === 0 ? (
          <div className="empty-box">
            هنوز هیچ بازی‌ای ثبت نشده است.
          </div>
        ) : (
          <div className="games-table">

            {games.map((game) => (
              <article
                key={game.id}
                className="game-row"
              >

                <div className="game-row-image">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                    />
                  ) : (
                    <span>✦</span>
                  )}
                </div>


                <div className="game-row-info">

                  <h3>{game.name}</h3>

                  {game.description && (
                    <p>{game.description}</p>
                  )}

                  <div className="game-meta">

                    <span>
                      ⏱ {game.duration}
                    </span>

                    <span>
                      👥 {game.capacity}
                    </span>

                    <span>
                      {game.price.toLocaleString("fa-IR")} تومان
                    </span>

                  </div>

                </div>


                <div className="game-row-status">
                  <button
                    type="button"
                    className={`status-badge ${
                      game.isActive
                        ? "active"
                        : "inactive"
                    }`}
                    onClick={() =>
                      toggleActive(game)
                    }
                  >
                    {game.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </button>
                </div>


                <div className="game-row-actions">

                  <button
                    type="button"
                    className="edit-button"
                    onClick={() =>
                      editGame(game)
                    }
                  >
                    ویرایش
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() =>
                      deleteGame(game.id)
                    }
                  >
                    حذف
                  </button>

                </div>

              </article>
            ))}

          </div>
        )}

      </section>


    </main>
  );
}