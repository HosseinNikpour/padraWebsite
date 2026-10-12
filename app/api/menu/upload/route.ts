import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "فایلی ارسال نشده است" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "فقط فایل تصویری مجاز است" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "حجم تصویر نباید بیشتر از ۵ مگابایت باشد" },
        { status: 400 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const filename = `menu/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;

    const blob = await put(filename, file, {
      access: "public",
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