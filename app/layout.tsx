import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import localFont from "next/font/local";
import { FeedbackProvider } from "@/components/ui/Feedback";

const vazirmatn = localFont({
  // یک فونت متغیر که همه‌ی وزن‌های ۱۰۰ تا ۹۰۰ را پوشش می‌دهد
  src: "../public/fonts/Vazirmatn/Vazirmatn-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "پادرا | بازی، رقابت، هیجان",
  description: "پادرا؛ مجموعه‌ای برای بازی، رقابت و تجربه‌های متفاوت",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.variable}>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}