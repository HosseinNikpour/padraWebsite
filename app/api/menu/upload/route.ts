import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { authorize } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024;

/** نوع مجاز -> پسوند و بررسی magic bytes (SVG عمداً مجاز نیست: ریسک XSS) */
const ALLOWED: Record<
  string,
  { ext: string; match: (b: Uint8Array) => boolean }
> = {
  "image/jpeg": {
    ext: "jpg",
    match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    match: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/webp": {
    ext: "webp",
    match: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  "image/gif": {
    ext: "gif",
    match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
};

export async function POST(request: Request) {
  try {
    const auth = await authorize([
      "menu.manage",
      "games.manage",
      "events.manage",
    ]);
    if (!auth.ok) return auth.response;

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "فایلی ارسال نشده است" },
        { status: 400 }
      );
    }

    const rule = ALLOWED[file.type];

    if (!rule) {
      return NextResponse.json(
        { error: "فقط تصویر JPG، PNG، WEBP یا GIF مجاز است" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد" },
        { status: 400 }
      );
    }

    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

    if (!rule.match(header)) {
      return NextResponse.json(
        { error: "محتوای فایل با نوع تصویر مطابقت ندارد" },
        { status: 400 }
      );
    }

    const filename = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${rule.ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({
      url: blob.url,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return NextResponse.json(
      { error: "خطا در آپلود تصویر" },
      { status: 500 }
    );
  }
}
