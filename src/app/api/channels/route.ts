import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { sanitizeUserText } from "@/lib/sanitize";
import {
  channelDescriptionSchema,
  channelNameSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { rows } = await query<{
      id: number;
      name: string;
      description: string;
      created_at: string;
      created_by_name: string;
      post_count: string;
    }>(
      `SELECT c.id, c.name, c.description, c.created_at,
              u.display_name AS created_by_name,
              COUNT(p.id)::text AS post_count
       FROM channels c
       JOIN users u ON u.id = c.created_by
       LEFT JOIN posts p ON p.channel_id = c.id
       GROUP BY c.id, u.display_name
       ORDER BY c.name ASC`,
    );
    return NextResponse.json({
      channels: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        createdAt: r.created_at,
        createdByDisplayName: r.created_by_name,
        postCount: Number(r.post_count),
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

const createSchema = z.object({
  name: channelNameSchema,
  description: channelDescriptionSchema,
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const { name, description } = createSchema.parse(json);
    const cleanName = sanitizeUserText(name);
    const cleanDesc = sanitizeUserText(description);
    if (!cleanName) return jsonError(400, "Name is required");
    const { rows } = await query<{ id: number }>(
      `INSERT INTO channels (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [cleanName, cleanDesc, user.id],
    );
    const id = rows[0]?.id;
    if (id == null) return jsonError(500, "Could not create channel");
    return NextResponse.json({ id });
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
    ) {
      return jsonError(409, "A channel with that name already exists");
    }
    return handleRouteError(e);
  }
}
