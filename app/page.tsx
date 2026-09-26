"use client"

import Header from "../components/Header";
import { useEffect, useState } from "react";
import "./mainpage.css";

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean | true;
};
type GameItem = {
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

export default function Home() {

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    loadTodayEvents();
    loadGames();
  }, []);

  async function loadTodayEvents() {
    try {
      const response = await fetch("/api/events");

      if (!response.ok) {
        throw new Error("خطا در دریافت ایونت‌ها");
      }

      const data: EventItem[] = await response.json();

      const today = new Date();

      const todayEvents = data.filter((event) => {
        if (!event.isActive) {
          return false;
        }

        const eventDate = new Date(event.eventDate);

        return (
          eventDate.getFullYear() === today.getFullYear() &&
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getDate() === today.getDate()
        );
      });

      setEvents(todayEvents);

      // اولین ایونت به صورت پیش‌فرض انتخاب شود
      if (todayEvents.length > 0) {
        setSelectedEvent(todayEvents[0]);
      } else {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("TODAY EVENTS ERROR:", error);
    } finally {
      setEventsLoading(false);
    }
  }
  async function loadGames() {
    try {
      setGamesLoading(true);

      const response = await fetch("/api/games");

      if (!response.ok) {
        throw new Error("خطا در دریافت بازی‌ها");
      }

      const data: GameItem[] = await response.json();

      const activeGames = data
        .filter((game) => game.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setGames(activeGames);
    } catch (error) {
      console.error("GAMES LOAD ERROR:", error);
    } finally {
      setGamesLoading(false);
    }
  }

  return (
    <>
      <Header />

      <main>
        {/* HERO */}
        <section id="home" className="hero section-anchor">
          <div className="hero-background">
             
            <div className="hero-circle hero-circle-one" />
            <div className="hero-circle hero-circle-two" />
          </div>

          <div className="container hero-container">
            <div className="hero-content">
              <p className="eyebrow">PADRA ENTERTAINMENT PARK</p>

              <h1>
                اینجا فقط
                <br />
                <span>بازی نمی‌کنی.</span>
                <br />
                تجربه می‌سازی.
              </h1>

              <p className="hero-description">
                مجموعه‌ای متفاوت برای بازی، رقابت، هیجان و ساختن
                خاطراتی که ارزش تکرار دارند.
              </p>

              <div className="hero-actions">
                <a href="#games" className="button button-primary">
                  بازی‌ها را ببین
                </a>

                <a href="#events" className="button button-secondary">
                  برگزاری ایونت
                </a>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-card">
                 <img src="/img/padra_logo.png" alt="پادرا"   width={180}    height={300}   style={{ marginTop: "39px",marginRight: "91px"  }}/>
                {/* <div className="hero-card-top">
                  <span>PADRA</span>
                  <span>01 — 05</span>
                </div> */}

                <div className="hero-card-center">
                  <strong>PLAY</strong>
                  <span>COMPETE</span>
                  <span>EXPERIENCE</span>
                </div>

                <div className="hero-card-bottom">
                  <span>ENTERTAINMENT</span>
                  <span>TEHRAN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-scroll">SCROLL ↓</div>
        </section>

        {/* today */}
        <section className="today-section">
          <div className="today-header">
            <span className="section-eyebrow">
              TODAY AT PADRA
            </span>

            <h2>امروز در پادرا چه خبره؟</h2>

            <p>
              برنامه‌ها و اتفاقات امروز پادرا
            </p>
          </div>

          {eventsLoading ? (
            <div className="today-loading">
              در حال دریافت برنامه‌های امروز...
            </div>
          ) : events.length === 0 ? (
            <div className="today-empty">
              <div className="today-empty-icon">✦</div>

              <h3>امروز برنامه‌ای نداریم</h3>

              <p>
                برای اطلاع از برنامه‌های جدید پادرا دوباره سر بزنید.
              </p>
            </div>
          ) : (
            <div className="today-events-layout">

              {/* LEFT — Timeline */}
              <div className="today-events-list">
                <div className="events-list-line" />

                {events.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;

                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`event-timeline-item ${isSelected ? "selected" : ""
                        }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="event-timeline-dot">
                        <span />
                      </div>

                      <div className="event-timeline-info">
                        <div className="event-timeline-time">
                          {event.startTime || "امروز"}

                          {event.endTime && (
                            <> — {event.endTime}</>
                          )}
                        </div>

                        <h3>{event.title}</h3>

                        {event.description && (
                          <p>{event.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* RIGHT — Selected Event */}
              <div className="today-event-detail">
                {selectedEvent && (
                  <>
                    <div className="event-detail-image">
                      {selectedEvent.image ? (
                        <img
                          src={selectedEvent.image}
                          alt={selectedEvent.title}
                        />
                      ) : (
                        <div className="event-detail-placeholder">
                          <span>✦</span>
                          <p>PADRA</p>
                        </div>
                      )}
                    </div>

                    <div className="event-detail-content">

                      <div className="event-detail-meta">
                        <span>
                          {selectedEvent.startTime || "امروز"}

                          {selectedEvent.endTime && (
                            <> — {selectedEvent.endTime}</>
                          )}
                        </span>
                      </div>

                      <h3>{selectedEvent.title}</h3>

                      {selectedEvent.description && (
                        <p>{selectedEvent.description}</p>
                      )}

                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </section>

        {/* GAMES */}
        <section
          id="games"
          className="section games-section section-anchor"
        >
          <div className="container">

            <div className="section-heading">
              <div>
                <p className="section-label">OUR GAMES</p>

                <h2>
                  بازی‌هایی برای <span>رقابت</span> و <span>همکاری</span>
                </h2>
              </div>

              <p>
                هر بازی یک تجربه متفاوت است؛
                <br />
                انتخاب کن و آماده رقابت شو.
              </p>
            </div>


            {gamesLoading ? (
              <div className="games-loading">
                در حال دریافت بازی‌ها...
              </div>
            ) : games.length === 0 ? (
              <div className="games-empty">
                در حال حاضر بازی‌ای برای نمایش وجود ندارد.
              </div>
            ) : (
              <div className="games-grid">

                {games.map((game) => (
                  <article
                    className="game-card"
                    key={game.id}
                  >

                    <div className="game-image">

                      {game.image ? (
                        <img
                          src={game.image}
                          alt={game.name}
                        />
                      ) : (
                        <span>
                          {game.name}
                        </span>
                      )}

                    </div>


                    <div className="game-card-content">

                      <h3>{game.name}</h3>

                      {game.description && (
                        <p>{game.description}</p>
                      )}


                      <div className="game-details">

                        <span>
                          <small>مدت</small>
                          {game.duration}
                        </span>

                        <span>
                          <small>ظرفیت</small>
                          {game.capacity}
                        </span>

                        <span>
                          <small>قیمت</small>
                          {game.price.toLocaleString("fa-IR")} تومان
                        </span>

                      </div>

                    </div>


                    <a
                       href={`/booking?gameId=${game.id}`}
                      className="game-button"
                    >
                      رزرو نوبت
                      <span>←</span>
                    </a>

                  </article>
                ))}

              </div>
            )}

          </div>
        </section>



        {/* CAFE */}
        <section id="cafe" className="section cafe-section section-anchor">
          <div className="container cafe-grid">
            <div className="cafe-visual">
              <div className="cafe-placeholder">
                <span>CAFE</span>
                <strong>PADRA</strong>
              </div>
            </div>

            <div className="cafe-content">
              <p className="section-label">03 / CAFE</p>

              <h2>
                بعد از بازی،
                <br />
                <span>وقت کافه است.</span>
              </h2>

              <p>
                یک فضای راحت برای استراحت، تماشای مسابقه، بازی و
                دورهمی با دوستان.
              </p>

              <div className="feature-list">
                <div>
                  <span>01</span>
                  <strong>کافه</strong>
                </div>

                <div>
                  <span>02</span>
                  <strong>نمایش مسابقات</strong>
                </div>

                <div>
                  <span>03</span>
                  <strong>بازی و دورهمی</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EVENTS */}
        <section id="birthday" className="section events-section section-anchor">
          <div className="container">
            <div className="events-content">
              <p className="section-label">04 / EVENTS</p>

              <h2>
                تولد،
                <br />
                ایونت،
                <br />
                <span>یا یک دورهمی متفاوت.</span>
              </h2>

              <p>
                برای گروه دوستان، تیم‌های کاری، جشن تولد و هر مناسبتی
                که می‌خواهی متفاوت برگزار شود.
              </p>

              <a href="#contact" className="button button-primary">
                هماهنگی ایونت
              </a>
            </div>

            <div className="events-box">
              <div>EVENT</div>
              <strong>MAKE<br />IT<br />DIFFERENT.</strong>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="section about-section section-anchor">
          <div className="container about-grid">
            <div>
              <p className="section-label">05 / ABOUT</p>
              <h2>
                پادرا
                <br />
                یعنی <span>تجربه.</span>
              </h2>
            </div>

            <div className="about-text">
              <p>
                ما پادرا را برای آدم‌هایی ساختیم که دوست دارند وقت
                آزادشان را جور دیگری بگذرانند.
              </p>

              <p>
                از رقابت و بازی گرفته تا کافه و دورهمی؛ همه چیز در
                پادرا برای ساختن یک تجربه خوب کنار هم قرار گرفته است.
              </p>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="section contact-section section-anchor">
          <div className="container contact-container">
            <p className="section-label">06 / CONTACT</p>

            <h2>
              آماده‌ای
              <br />
              <span>بازی کنیم؟</span>
            </h2>

            <p>
              برای رزرو، برگزاری ایونت و اطلاعات بیشتر با ما در ارتباط
              باشید.
            </p>

            <div className="contact-actions">
              <a href="#games" className="button button-primary">
                مشاهده بازی‌ها
              </a>

              <a href="#home" className="button button-secondary">
                بازگشت به بالا ↑
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>PADRA</strong>
          <span>PLAY · COMPETE · EXPERIENCE</span>
          <span>© 2026 PADRA</span>
        </div>
      </footer>
    </>
  );
}
