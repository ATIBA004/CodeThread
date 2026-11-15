import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { sanitizeUserText } from "@/lib/sanitize";
import { postBodySchema, postTitleSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: raw } = await context.params;
    const channelId = Number(raw);
    if (!Number.isFinite(channelId)) return jsonError(400, "Invalid channel id");
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    const { rows: countRows } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM posts WHERE channel_id = $1`,
      [channelId],
    );
    const total = Number(countRows[0]?.n ?? "0");
    const { rows } = await query<{
      id: number;
      title: string;
      body: string;
      created_at: string;
      author_display_name: string;
      score: string;
      user_vote: number | null;
    }>(
      `SELECT p.id, p.title, p.body, p.created_at,
              u.display_name AS author_display_name,
              COALESCE(SUM(v.value), 0)::text AS score,
              (SELECT value FROM votes vx
               WHERE vx.target_type = 'post' AND vx.target_id = p.id
                 AND vx.user_id = $4
               LIMIT 1) AS user_vote
       FROM posts p
       JOIN users u ON u.id = p.author_id
       LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
       WHERE p.channel_id = $1
       GROUP BY p.id, u.display_name
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, pageSize, offset, user?.id ?? -1],
    );
    return NextResponse.json({
      posts: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        authorDisplayName: r.author_display_name,
        score: Number(r.score),
        userVote: r.user_vote,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

const createSchema = z.object({
  title: postTitleSchema,
  body: postBodySchema,
});

export async function POST(req: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`postwrite:${user.id}`, 40, 60 * 1000);
    if (!rl.ok) {
      return jsonError(
        429,
        `You are posting too quickly. Try again in ${rl.retryAfterSec}s.`,
      );
    }
    const { id: raw } = await context.params;
    const channelId = Number(raw);
    if (!Number.isFinite(channelId)) return jsonError(400, "Invalid channel id");
    const json = await req.json();
    const { title, body } = createSchema.parse(json);
    const t = sanitizeUserText(title);
    const b = sanitizeUserText(body);
    if (!t || !b) return jsonError(400, "Title and body are required");
    const { rows: ch } = await query<{ id: number }>(
      `SELECT id FROM channels WHERE id = $1`,
      [channelId],
    );
    if (!ch[0]) return jsonError(404, "Channel not found");
    const { rows } = await query<{ id: number }>(
      `INSERT INTO posts (channel_id, author_id, title, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [channelId, user.id, t, b],
    );
    const id = rows[0]?.id;
    if (id == null) return jsonError(500, "Could not create post");
    return NextResponse.json({ id });
  } catch (e) {
    return handleRouteError(e);
  }
}
