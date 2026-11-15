import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { targetTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";

const bodySchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.number().int().positive(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const { targetType, targetId, value } = bodySchema.parse(json);

    if (targetType === "post") {
      const { rows } = await query<{ author_id: number }>(
        `SELECT author_id FROM posts WHERE id = $1`,
        [targetId],
      );
      if (!rows[0]) return jsonError(404, "Post not found");
      if (rows[0].author_id === user.id) {
        return jsonError(400, "You cannot vote on your own post");
      }
    } else {
      const { rows } = await query<{ author_id: number }>(
        `SELECT author_id FROM replies WHERE id = $1`,
        [targetId],
      );
      if (!rows[0]) return jsonError(404, "Reply not found");
      if (rows[0].author_id === user.id) {
        return jsonError(400, "You cannot vote on your own reply");
      }
    }

    if (value === 0) {
      await query(
        `DELETE FROM votes
         WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
        [user.id, targetType, targetId],
      );
    } else {
      await query(
        `INSERT INTO votes (user_id, target_type, target_id, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, target_type, target_id)
         DO UPDATE SET value = EXCLUDED.value`,
        [user.id, targetType, targetId, value],
      );
    }

    const { rows: sc } = await query<{ s: string }>(
      `SELECT COALESCE(SUM(value), 0)::text AS s FROM votes
       WHERE target_type = $1 AND target_id = $2`,
      [targetType, targetId],
    );
    const { rows: uv } = await query<{ v: number | null }>(
      `SELECT value AS v FROM votes
       WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
      [user.id, targetType, targetId],
    );

    return NextResponse.json({
      score: Number(sc[0]?.s ?? "0"),
      userVote: uv[0]?.v ?? null,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
