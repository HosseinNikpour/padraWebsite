import { NextResponse } from "next/server";

import { getSessionIdentity, resolveRedirect } from "@/lib/session";

/**
 * هویت فعلی بازدیدکننده: { type: "staff" | "customer" | null, name, redirect }
 * GET /api/session?next=/some/path
 */
export async function GET(request: Request) {
  const identity = await getSessionIdentity();
  const next = new URL(request.url).searchParams.get("next");

  return NextResponse.json(
    identity
      ? { ...identity, redirect: resolveRedirect(identity.type, next) }
      : { type: null, name: null, redirect: null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
