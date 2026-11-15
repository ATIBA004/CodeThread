import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: Params) {
  try {
    await requireAdmin();
    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return jsonError(400, "Invalid channel id");
    const { rowCount } = await query(`DELETE FROM channels WHERE id = $1`, [id]);
    if (!rowCount) return jsonError(404, "Channel not found");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
