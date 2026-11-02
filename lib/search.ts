import { normalizeDigits } from "@/lib/availability";

/** یکسان‌سازی متن برای جست‌وجو: اعداد فارسی/عربی → لاتین، «ي/ك» عربی → «ی/ک»، حروف کوچک، فاصله‌ی اضافی حذف. */
export function normalizeSearch(text: string) {
  return normalizeDigits(text)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** همه‌ی کلمه‌های جست‌وجو (جداشده با فاصله) باید در متن وجود داشته باشند. جست‌وجوی خالی همه‌چیز را می‌پذیرد. */
export function matchesQuery(haystack: string, query: string) {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);

  if (!terms.length) return true;

  const text = normalizeSearch(haystack);

  return terms.every((term) => text.includes(term));
}
