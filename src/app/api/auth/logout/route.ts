import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleRouteError } from "@/lib/apiErrors";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
