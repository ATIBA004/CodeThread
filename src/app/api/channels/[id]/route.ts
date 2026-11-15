import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/apiErrors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return jsonError(400, "Invalid channel id");
    const { rows } = await query<{
      id: number;
      name: string;
      description: string;
      created_at: string;
      created_by_name: string;
    }>(
      `SELECT c.id, c.name, c.description, c.created_at, u.display_name AS created_by_name
       FROM channels c
       JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [id],
    );
    const c = rows[0];
    if (!c) return jsonError(404, "Channel not found");
    return NextResponse.json({
      channel: {
        id: c.id,
        name: c.name,
        description: c.description,
        createdAt: c.created_at,
        createdByDisplayName: c.created_by_name,
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
