import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/apiErrors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
