"use client";

import Link from "next/link";
import Header from "../components/Header";
import { useEffect, useState } from "react";
import "./styles/home/base.css";
import "./styles/home/hero.css";
import "./styles/home/games.css";
import "./styles/home/today.css";
import "./styles/home/cafe.css";
import "./styles/home/birthday.css";
import "./styles/home/about.css";


type EventSlot = {
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity: number;
  remaining: number;
};

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  genre: string | null;
  duration: number | null;
  isActive?: boolean;
  slots: EventSlot[];
};


type GameItem = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  duration: string | null;
  capacity: string | null;
  price: number | null;
  sortOrder: number;
  isActive: boolean;
};

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  //const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    loadTodayEvents();
    loadGames();
  }, []);


  async function loadTodayEvents() {
    try {
      setLoadingEvents(true);

      const res = await fetch("/api/events/available", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load events");
      }

      const data: EventItem[] = await res.json();

      setEvents(data);
    } catch (error) {
      console.error("LOAD TODAY EVENTS ERROR:", error);

      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }



  async function loadGames() {
    try {
      setLoadingGames(true);

      const res = await fetch("/api/games");

      if (!res.ok) {
        throw new Error("Failed to load games");
      }

      const data = await res.json();

      const activeGames = data
        .filter((game: GameItem) => game.isActive)
        .sort(
          (a: GameItem, b: GameItem) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

      setGames(activeGames);
    } catch (error) {
      console.error(error);
      setGames([]);
    } finally {
      setLoadingGames(false);
    }
  }

  function formatPrice(price: number | null) {
    if (!price) return "استعلام قیمت";

    return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
  }

  return (
    <main className="home-page">
      <Header />

      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="hero-section" id="home">
        <div className="hero-grid"></div>
        <div className="hero-noise"></div>

        <div className="hero-side-label">
          <span>PADRA PARK</span>
          <span>ENTERTAINMENT CENTER</span>
        </div>

        {/* <div className="hero-number">
          <span>01</span>
          <small>/ 05</small>
        </div> */}

        <div className="hero-content">
          <div className="hero-kicker">
            <span className="hero-kicker-line"></span>
            <span>PLAY · COMPETE · EXPERIENCE</span>
          </div>

          <h1>
            بازی فقط
            <br />
            <strong>شروع ماجراست.</strong>
          </h1>

          <p>
            جایی برای رقابت، هیجان، خنده و ساختن یک شب متفاوت.
          </p>

          {/* <div className="hero-actions">
            <Link href="/booking" className="primary-action">
              <span>رزرو بازی</span>
              <span className="action-arrow">↗</span>
            </Link>

            <a href="#games" className="secondary-action">
              دیدن بازی‌ها
            </a>
          </div> */}
        </div>

        <div className="hero-visual">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/img/safine.mp4" type="video/mp4" />
          </video>

          <div className="hero-image-overlay"></div>

          <div className="hero-image-caption">
            <span>FEATURED EXPERIENCE</span>
            <strong>PADRA PARK</strong>
          </div>

          <div className="hero-corner top-left"></div>
          <div className="hero-corner bottom-right"></div>
        </div>

        {/* <div className="hero-bottom">
          <div>
            <span>LOCATION</span>
            <strong>تهران · پونک</strong>
          </div>

          <div>
            <span>EXPERIENCES</span>
            <strong>{games.length || 5} بازی</strong>
          </div>

          <div>
            <span>BOOKING</span>
            <strong>ONLINE</strong>
          </div>

          <div className="hero-scroll">
            <span>SCROLL</span>
            <i></i>
          </div>
        </div> */}
      </section>


      {/* =====================================================
          GAMES
      ===================================================== */}
      <section className="games-section" id="games">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE EXPERIENCES</span>
            <h2>
              انتخاب کن.
              <br />
              <strong>بازی شروع میشه.</strong>
            </h2>
          </div>

          {/* <div className="section-index">02</div> */}
        </div>

        {loadingGames ? (
          <div className="games-loading">در حال بارگذاری بازی‌ها...</div>
        ) : games.length === 0 ? (
          <div className="games-empty">
            در حال آماده‌سازی تجربه‌های پادرا هستیم.
          </div>
        ) : (
          <div className="games-layout">
            {games.map((game, index) => (
              <article
                className="game-card"
                key={game.id}
              >
                <Link
                  href={`/booking?gameId=${game.id}`}
                  className="game-card-link"
                >
                  <div className="game-card-image-wrap">
                    {game.image ? (
                      <img loading="lazy" decoding="async"
                        src={game.image}
                        alt={game.name}
                        className="game-card-image"
                      />
                    ) : (
                      <div className="game-card-placeholder">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                    )}

                    <div className="game-card-image-overlay"></div>

                    <div className="game-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="game-card-top">
                      <span>EXPERIENCE</span>
                      <span>↗</span>
                    </div>
                  </div>

                  <div className="game-card-content">
                    <div className="game-title-row">
                      <h3>{game.name}</h3>
                      <span className="game-arrow">↗</span>
                    </div>

                    {game.description && (
                      <p>{game.description}</p>
                    )}

                    <div className="game-meta">
                      {game.duration && (
                        <span>
                          <b>مدت</b>
                          {(game.duration)}
                        </span>
                      )}

                      {game.capacity && (
                        <span>
                          <b>تعداد بازیکن</b>
                          {(game.capacity)}
                        </span>
                      )}

                      {game.price && (
                        <span>
                          <b>قیمت</b>
                          {formatPrice(game.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          TODAY
      ===================================================== */}
      <section className="today-section" id="today">
        <div className="today-background-grid"></div>

        <div className="today-header">
          <div className="today-header-title">
            <span className="eyebrow">LIVE AT PADRA</span>

            <h2>
              چه ایونتی رزرو کنیم؟
            </h2>

            <p>
              همه سانس‌های آزاد ایونت‌های پادرا را ببین و همان‌جا انتخاب کن.
            </p>
          </div>

          <div className="today-date">
            <span>امروز</span>

            <strong>
              {new Intl.DateTimeFormat("fa-IR", {
                day: "numeric",
                month: "long",
              }).format(new Date())} 
            </strong>
          </div>
        </div>

        {loadingEvents ? (
          <div className="today-loading">
            در حال بررسی برنامه امروز...
          </div>
        ) : events.length === 0 ? (
          <div className="today-empty">
            <div className="empty-icon">+</div>

            <h3>امروز برنامه ویژه‌ای نداریم.</h3>

            <p>
              ولی بازی‌ها همیشه آماده‌اند.
            </p>
          </div>
        ) : (
          <div className="today-editorial">
            {events.map((event, index) => {
              const slots = event.slots ?? [];

              return (
                <article
                  key={event.id}
                  className="today-editorial-row"
                >
               {/* شماره و دسته‌بندی */}
                  <div className="today-editorial-index">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <small>{event.genre || "EVENT"}</small>
                  </div>

                  {/* اطلاعات ایونت */}
                  <div className="today-editorial-info">
                    <h3>{event.title}</h3>

                    {event.description && <p>{event.description}</p>}

                    {event.duration && (
                      <div className="today-editorial-duration">
                        <span>مدت</span>
                        <strong>{event.duration} دقیقه</strong>
                      </div>
                    )}
                  </div>

                  {/* تصویر */}
                  <div className="today-editorial-image">
                    {event.image ? (
                      <img loading="lazy" decoding="async" src={event.image} alt={event.title} />
                    ) : (
                      <div className="today-editorial-image-placeholder">
                        <span>PADRA</span>
                        <strong>EVENT</strong>
                      </div>
                    )}
                    <div className="today-editorial-image-overlay"></div>
                  </div>
    {/* سانس‌ها در سمت راست ایونت */}
                  <div className="today-editorial-schedule">
                    <div className="schedule-heading">
                      <span>سانس‌های قابل رزرو</span>
                      <small>{new Intl.NumberFormat("fa-IR").format(slots.length)} سانس</small>
                    </div>

                    {slots.length > 0 ? (
                      <div className="schedule-times">
                        {slots.map((slot) => (
                          <Link
                            key={`${slot.date}-${slot.startTime}`}
                            href={`/booking?eventId=${event.id}&date=${slot.date}&startTime=${encodeURIComponent(slot.startTime)}`}
                            className="schedule-time schedule-time-link"
                          >
                            <small>{new Intl.DateTimeFormat("fa-IR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${slot.date}T00:00:00Z`))}</small>
                            <div className="schedule-time-main">
                              <strong>{slot.startTime}</strong>
                              <span>تا {slot.endTime}</span>
                            </div>
                            <small>{new Intl.NumberFormat("fa-IR").format(slot.price)} تومان · {new Intl.NumberFormat("fa-IR").format(slot.remaining)} ظرفیت</small>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="schedule-empty"><span>—</span><p>در حال حاضر سانس آزادی ندارد</p></div>
                    )}
                  </div>
                 
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* =====================================================
          PADRA cafe
      ===================================================== */}

      <section className="cafe-section" id="cafe">
        <div className="cafe-bg-shape cafe-bg-shape-one"></div>
        <div className="cafe-bg-shape cafe-bg-shape-two"></div>

        <div className="cafe-container">

          {/* معرفی کافه */}
          <div className="cafe-intro">
            <span className="cafe-eyebrow">
              CAFE AT PADRA
            </span>

            <h2>
              یک مکث خوب،
              <br />
              وسط یک روز <strong>هیجان‌انگیز.</strong>
            </h2>

            <p>
              بعد از بازی، وقتشه کمی آروم‌تر بشی.
              یک نوشیدنی خوش‌طعم، یک میز راحت
              و چند دقیقه دور از شلوغی.
            </p>

            <div className="cafe-actions">
              <a href="/menu" className="cafe-button cafe-button-primary">
                منوی کافه
                <span>↗</span>
              </a>

              <a href="tel:09386620999" className="cafe-button cafe-button-secondary">
                رزرو میز
                <span>↗</span>
              </a>
            </div>

            {/* دو عکس کوچک منو */}
            <div className="cafe-menu-preview">

              <a href="/menu" className="cafe-menu-item">
                <div className="cafe-menu-image">
                  <img loading="lazy" decoding="async"
                    src="/img/CafeMenu.gif"
                    alt="نوشیدنی کافه"
                  />
                </div>

                <div className="cafe-menu-overlay">
                  <div>
                    <strong>نوشیدنی‌ها</strong>
                    <span>HOT & COLD DRINKS</span>
                  </div>

                  <span className="cafe-menu-arrow">↗</span>
                </div>
              </a>

              <a href="/menu" className="cafe-menu-item">
                <div className="cafe-menu-image">
                  <img loading="lazy" decoding="async"
                    src="/img/CafeMenu2.gif"
                    alt="دسر"
                  />
                </div>

                <div className="cafe-menu-overlay">
                  <div>
                    <strong>دسر و میان‌وعده</strong>
                    <span>SNACKS</span>
                  </div>

                  <span className="cafe-menu-arrow">↗</span>
                </div>
              </a>

            </div>
          </div>


          {/* عکس بزرگ کافه */}
          <div className="cafe-visual">

            <img loading="lazy" decoding="async"
              src="/img/cafe.gif"
              alt="کافه پادرا"
            />

            <div className="cafe-visual-overlay"></div>

            <div className="cafe-visual-label">
              <span>PADRA</span>
              <strong>CAFE</strong>
            </div>

            <div className="cafe-visual-note">
              Good Food
              <br />
              Good Vibes
            </div>

          </div>

        </div>


        {/* ویژگی‌های کافه */}
        <div className="cafe-features">

          <div className="cafe-feature">
            <div className="cafe-feature-icon">☕</div>

            <div>
              <strong>قهوه و نوشیدنی</strong>
              <span>از اسپرسو تا نوشیدنی‌های ویژه</span>
            </div>
          </div>

          <div className="cafe-feature">
            <div className="cafe-feature-icon">◯</div>

            <div>
              <strong>فضای راحت</strong>
              <span>مبلمان مدرن و دنج</span>
            </div>
          </div>

          <div className="cafe-feature">
            <div className="cafe-feature-icon">▣</div>

            <div>
              <strong>تماشای مسابقات</strong>
              <span>روی پرده بزرگ پادرا</span>
            </div>
          </div>

          <div className="cafe-feature">
            <div className="cafe-feature-icon">♧</div>

            <div>
              <strong>دورهمی و گفتگو</strong>
              <span>با دوستان، خانواده و همکاران</span>
            </div>
          </div>

        </div>
      </section>


      {/* =====================================================
          EVENTS / BIRTHDAY
      ===================================================== */}
      {/* <section className="events-section">
        <div className="events-title">
          <span className="eyebrow">MAKE IT A NIGHT</span>

          <h2>
            تولد؟
            <br />
            <strong>دورهمی؟</strong>
          </h2>

          <p>
            وقتی قرار نیست یه شب معمولی داشته باشی،
            پادرا رو انتخاب کن.
          </p>

          <a href="tel:02100000000" className="text-action">
            هماهنگی و رزرو
            <span>↗</span>
          </a>
        </div>

        <div className="events-collage">
          <div className="collage-card collage-main">
            {games[2]?.image ? (
              <img loading="lazy" decoding="async" src={games[2].image} alt="Birthday" />
            ) : (
              <div className="collage-placeholder">
                <span>BIRTHDAY</span>
              </div>
            )}

            <div className="collage-overlay"></div>

            <div className="collage-caption">
              <span>01</span>
              <strong>BIRTHDAY</strong>
            </div>
          </div>

          <div className="collage-card collage-small">
            {games[3]?.image ? (
              <img loading="lazy" decoding="async" src={games[3].image} alt="Group Event" />
            ) : (
              <div className="collage-placeholder">
                <span>EVENT</span>
              </div>
            )}

            <div className="collage-caption">
              <span>02</span>
              <strong>GROUPS</strong>
            </div>
          </div>

          <div className="collage-note">
            <span>YOUR PEOPLE.</span>
            <strong>YOUR NIGHT.</strong>
          </div>
        </div>
      </section> */}

      {/* =====================================================
          BIRTHDAY
      ===================================================== */}
      <section className="birthday-section" id="birthday">

        <div className="birthday-bg-number">
          24
        </div>

        <div className="birthday-container">

          {/* HEADER */}
          <div className="birthday-heading">

            <span className="birthday-eyebrow">
              BIRTHDAYS AT PADRA
            </span>

            <h2>
              اینجا فقط

              <strong>  تولد نمی‌گیریم.</strong>
            </h2>

            <p>
              یه روز معمولی رو تبدیل کن به یه خاطره‌ای
              که همه دوست دارن دوباره تعریفش کنن.
            </p>

          </div>


          {/* PHOTO STORY */}
          <div className="birthday-story">

            {/* عکس کوچک */}
            <div className="birthday-photo birthday-photo-small">
              <img loading="lazy" decoding="async"
                src="/img/birthday2.gif"
                alt="جشن تولد در پادرا"
              />

              <span className="birthday-photo-label">
                THE MOMENT
              </span>
            </div>


            {/* عکس اصلی */}
            <div className="birthday-photo birthday-photo-main">

              <img loading="lazy" decoding="async"
                src="/img/birthday3.gif"
                alt="تولد در پادرا پارک"
              />

              <div className="birthday-photo-overlay"></div>

              <div className="birthday-photo-caption">
                <span>01 / 04</span>

                <strong>
                  یک روز،
                  <br />
                  کلی خاطره.
                </strong>
              </div>

            </div>


            {/* عکس سوم */}
            <div className="birthday-photo birthday-photo-third">
              <img loading="lazy" decoding="async"
                src="/img/birthday1.gif"
                alt="جشن تولد پادرا"
              />
            </div>

          </div>


          {/* EXPERIENCE STRIP */}
          <div className="birthday-experience">

            <div className="birthday-experience-title">
              <span>YOUR DAY</span>
              <strong>همه‌چیز برای یک روز متفاوت</strong>
            </div>

            <div className="birthday-experience-items">

              <div className="birthday-experience-item">
                <span>01</span>
                <strong>بازی</strong>
                <small>
                  هیجان برای همه
                </small>
              </div>

              <div className="birthday-experience-item">
                <span>02</span>
                <strong>کیک</strong>
                <small>
                  جشن بدون کیک نمی‌شه
                </small>
              </div>

              <div className="birthday-experience-item">
                <span>03</span>
                <strong>عکس و فیلم</strong>
                <small>
                  لحظه‌ها رو نگه دار
                </small>
              </div>

              <div className="birthday-experience-item">
                <span>04</span>
                <strong>کافه</strong>
                <small>
                  دورهمی بعد از بازی
                </small>
              </div>

            </div>

          </div>


          {/* BOTTOM CTA */}
          <div className="birthday-bottom">

            <div>
              <span>
                READY TO CELEBRATE?
              </span>

              <h3>
                تولدت رو
                <strong> پادرا‌یی کن.</strong>
              </h3>
            </div>

            <a
              href="tel:09386620999"
              className="birthday-cta"
            >
              اطلاعات تولد
              <span>↗</span>
            </a>

          </div>

        </div>
      </section>

      {/* =====================================================
          ABOUT
      ===================================================== */}

      <section className="about-section" id="about">

        <div className="about-bg-text">
          PADRA
        </div>

        <div className="about-container">

          {/* HEADER */}
          <div className="about-header">

            <div className="about-label">
              <span></span>
              ABOUT PADRA
            </div>

            <div className="about-header-number">
              {/* 04 */}
            </div>

          </div>


          {/* MAIN CONTENT */}
          <div className="about-main">

            {/* TEXT */}
            <div className="about-copy">

              <h2>
                پادرا فقط
                <br />
                <strong>یک جای بازی نیست.</strong>
              </h2>

              <p className="about-lead">
                ما پادرا را ساختیم برای آدم‌هایی که
                می‌خواهند چند ساعت از روزمرگی فاصله
                بگیرند، بازی کنند، بخندند و کنار هم
                یک تجربه متفاوت بسازند.
              </p>

              <p>
                از بازی‌های گروهی و هیجان‌انگیز گرفته
                تا کافه، ایونت، تولد و دورهمی؛
                پادرا جایی است که قرار نیست فقط
                یک سرگرمی را تجربه کنی.
              </p>

              <p>
                اینجا قرار است با آدم‌هایی که دوستشان
                داری وقت بگذرانی و چیزی برای تعریف
                کردن با خودت به خانه ببری.
              </p>

              {/* <a
                href="#contact"
                className="about-link"
              >
                بیشتر درباره پادرا
                <span>↗</span>
              </a> */}

            </div>


            {/* VISUAL */}
            <div className="about-visual">

              <img loading="lazy" decoding="async"
                src="/img/about/padra-about.jpg"
                alt="پادرا پارک"
                onError={(e) => {
                  // فایل تصویر هنوز در public/img/about قرار داده نشده است
                  e.currentTarget.style.display = "none";
                }}
              />

              <div className="about-visual-overlay"></div>

              <div className="about-visual-top">
                <span>EST.</span>
                <strong>PADRA</strong>
              </div>

              <div className="about-visual-bottom">
                <span>PLAY</span>
                <span>CONNECT</span>
                <span>REMEMBER</span>
              </div>

            </div>

          </div>


          {/* NUMBERS */}
          <div className="about-numbers">

            <div className="about-number-item">
              <strong>05</strong>

              <div>
                <span>EXPERIENCES</span>
                <p>تجربه متفاوت برای بازی</p>
              </div>
            </div>


            <div className="about-number-item">
              <strong>11+</strong>

              <div>
                <span>PEOPLE</span>
                <p>یک تیم برای ساختن تجربه بهتر</p>
              </div>
            </div>


            <div className="about-number-item">
              <strong>01</strong>

              <div>
                <span>PLACE</span>
                <p>یک مقصد برای چند ساعت خوش</p>
              </div>
            </div>


            <div className="about-number-item about-number-highlight">
              <strong>∞</strong>

              <div>
                <span>MEMORIES</span>
                <p>خاطره‌هایی که می‌مانند</p>
              </div>
            </div>

          </div>


          {/* BOTTOM STATEMENT */}
          <div className="about-statement">

            <span>THE PADRA IDEA</span>

            <h3>
              بازی شروع ماست،
              <br />
              <strong>اما داستان همین‌جا تمام نمی‌شود.</strong>
            </h3>

          </div>

        </div>
      </section>


    </main>
  );
}