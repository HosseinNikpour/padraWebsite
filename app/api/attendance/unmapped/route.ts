import { NextResponse } from "next/server";

import { authorize } from "@/lib/auth";
import { findUnmappedCodes } from "@/lib/attendance-service";

export async function GET() {
  const auth = await authorize("attendance.manage");
  if (!auth.ok) return auth.response;

  return NextResponse.json(await findUnmappedCodes(), { headers: { "Cache-Control": "no-store" } });
}
