-- مشتریان سایت
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- پرداخت و کد رهگیری روی رزرو
ALTER TABLE "Booking"
  ADD COLUMN "customerId" INTEGER,
  ADD COLUMN "paymentAuthority" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "trackingCode" TEXT;

CREATE UNIQUE INDEX "Booking_paymentAuthority_key" ON "Booking"("paymentAuthority");
CREATE UNIQUE INDEX "Booking_trackingCode_key" ON "Booking"("trackingCode");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_customerPhone_idx" ON "Booking"("customerPhone");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- رزروهای قدیمیِ بدون پرداخت که CONFIRMED بوده‌اند، بدون کد رهگیری باقی می‌مانند (null مجاز است)
