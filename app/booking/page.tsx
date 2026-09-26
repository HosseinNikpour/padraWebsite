import { Suspense } from "react";

import BookingClient from "./BookingClient";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main className="booking-page">
          <div className="booking-container">
            <div className="booking-loading">
              در حال بارگذاری صفحه رزرو...
            </div>
          </div>
        </main>
      }
    >
      <BookingClient />
    </Suspense>
  );
}