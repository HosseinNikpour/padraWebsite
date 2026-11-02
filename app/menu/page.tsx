"use client";

import { useEffect, useState } from "react";
import "./menu.css";

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  sortOrder: number;
};

type MenuCategory = {
  id: number;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      const response = await fetch("/api/menu");

      if (!response.ok) {
        throw new Error("خطا در دریافت منو");
      }

      const data = await response.json();

      setCategories(data);

      if (data.length > 0) {
        setActiveCategory(data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const currentCategory = categories.find(
    (category) => category.id === activeCategory
  );

  if (loading) {
    return (
      <main className="menu-page" dir="rtl">
        <div className="menu-loading">
          <div className="loading-dot" />
          <span>در حال آماده‌سازی منو</span>
        </div>
      </main>
    );
  }

  return (
    <main className="menu-page" dir="rtl">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-brand">
          <div className="brand-symbol">P</div>

          <div className="brand-text">
            <strong>پادرا</strong>
            <span>CAFE</span>
          </div>
        </div>

        <div className="header-label">MENU</div>
      </header>

      {/* Intro */}
      <section className="menu-intro">
        <span>کافه پادرا</span>

        <h1>
          چیزی برای
          <br />
          <strong>حال خوب.</strong>
        </h1>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <nav className="category-nav">
          <div className="category-scroll">
            {categories.map((category, index) => (
              <button
                key={category.id}
                className={
                  activeCategory === category.id
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="category-number">
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Menu */}
      <section className="menu-content">
        {currentCategory && (
          <>
            <div className="category-heading">
              <div>
                <span className="category-eyebrow">CATEGORY</span>

                <h2>{currentCategory.name}</h2>
              </div>

              <span className="category-count">
                {currentCategory.items.length.toLocaleString("fa-IR")}
                <small> آیتم</small>
              </span>
            </div>

            {currentCategory.items.length === 0 ? (
              <div className="empty-state">
                <span>☕</span>
                <h3>هنوز چیزی اینجا نیست</h3>
                <p>به‌زودی این بخش تکمیل می‌شود.</p>
              </div>
            ) : (
              <div className="menu-list">
                {currentCategory.items.map((item, index) => (
                  <article className="menu-item" key={item.id}>
                    <div className="item-number">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>

                    <div className="item-image">
                      {item.image ? (
                        <img loading="lazy" decoding="async" src={item.image} alt={item.name} />
                      ) : (
                        <div className="image-placeholder">
                          <span>☕</span>
                        </div>
                      )}
                    </div>

                    <div className="item-details">
                      <div className="item-name-row">
                        <h3>{item.name}</h3>

                        <div className="item-dots" />

                        <div className="item-price">
                          {item.price.toLocaleString("fa-IR")}
                          <small> تومان</small>
                        </div>
                      </div>

                      {item.description && (
                        <p>{item.description}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {categories.length === 0 && (
        <div className="empty-state full-empty">
          <span>☕</span>
          <h3>منو در حال آماده‌سازی است</h3>
          <p>به‌زودی منوی کافه پادرا در دسترس خواهد بود.</p>
        </div>
      )}

      {/* Footer */}
      <footer className="menu-footer">
        <div>
          <strong>PADRA</strong>
          <span>CAFE & MORE</span>
        </div>

        <p>لحظات خوب، طعم خوب</p>
      </footer>
    </main>
  );
}

