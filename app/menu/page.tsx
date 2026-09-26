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
  const [activeCategory, setActiveCategory] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      const response = await fetch("/api/menu");

      if (!response.ok) {
        throw new Error();
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
        <div className="loading">
          <div className="spinner" />
          <span>در حال دریافت منو...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="menu-page" dir="rtl">
      {/* Header */}

      <header className="menu-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-mark">P</div>

            <div>
              <strong>پادراپارک</strong>
              <span>کافه پادرا</span>
            </div>
          </div>

          <div className="header-title">
            <span>منوی کافه</span>
          </div>
        </div>
      </header>

      {/* Category Navigation */}

      {categories.length > 0 && (
        <nav className="category-nav">
          <div className="category-scroll">
            {categories.map((category) => (
              <button
                key={category.id}
                className={
                  activeCategory === category.id
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() =>
                  setActiveCategory(category.id)
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content */}

      <section className="menu-content">
        {currentCategory && (
          <>
            <div className="category-title">
              <div className="title-line" />

              <div>
                <h1>{currentCategory.name}</h1>
                <span>
                  {currentCategory.items.length.toLocaleString(
                    "fa-IR"
                  )}{" "}
                  آیتم
                </span>
              </div>

              <div className="title-line" />
            </div>

            {currentCategory.items.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">☕</div>

                <h2>
                  آیتمی در این دسته وجود ندارد
                </h2>

                <p>
                  به‌زودی محصولات این بخش اضافه می‌شوند.
                </p>
              </div>
            ) : (
              <div className="menu-grid">
                {currentCategory.items.map((item) => (
                  <article
                    key={item.id}
                    className="menu-card"
                  >
                    {/* Image */}

                    <div className="item-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                        />
                      ) : (
                        <div className="no-image">
                          <span>☕</span>
                        </div>
                      )}

                      <div className="image-gradient" />
                    </div>

                    {/* Info */}

                    <div className="item-info">
                      <div className="item-top">
                        <h2>{item.name}</h2>

                        <div className="price">
                          <strong>
                            {item.price.toLocaleString(
                              "fa-IR"
                            )}
                          </strong>

                          <span>تومان</span>
                        </div>
                      </div>

                      {item.description && (
                        <p>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Empty Menu */}

      {categories.length === 0 && (
        <div className="empty full-empty">
          <div className="empty-icon">☕</div>

          <h2>منو در حال آماده‌سازی است</h2>

          <p>
            به‌زودی منوی کافه پادرا در دسترس خواهد بود.
          </p>
        </div>
      )}

      {/* Footer */}

      <footer className="menu-footer">
        <strong>پادراپارک</strong>

        <span>
          لحظات خوب، طعم خوب
        </span>
      </footer>

    
    </main>
  );
}