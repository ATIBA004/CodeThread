import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return jsonError(400, "Invalid post id");
    const user = await getCurrentUser();
    const { rows } = await query<{
      id: number;
      channel_id: number;
      channel_name: string;
      title: string;
      body: string;
      created_at: string;
      author_display_name: string;
      score: string;
      user_vote: number | null;
    }>(
      `SELECT p.id, p.channel_id, c.name AS channel_name, p.title, p.body, p.created_at,
              u.display_name AS author_display_name,
              COALESCE(SUM(v.value), 0)::text AS score,
              (SELECT value FROM votes vx
               WHERE vx.target_type = 'post' AND vx.target_id = p.id
                 AND vx.user_id = $2
               LIMIT 1) AS user_vote
       FROM posts p
       JOIN channels c ON c.id = p.channel_id
       JOIN users u ON u.id = p.author_id
       LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, c.name, u.display_name`,
      [id, user?.id ?? -1],
    );
    const p = rows[0];
    if (!p) return jsonError(404, "Post not found");

    const { rows: atts } = await query<{
      id: number;
      mime_type: string;
    }>(
      `SELECT id, mime_type FROM attachments
       WHERE target_type = 'post' AND target_id = $1
       ORDER BY id ASC`,
      [id],
    );

    return NextResponse.json({
      post: {
        id: p.id,
        channelId: p.channel_id,
        channelName: p.channel_name,
        title: p.title,
        body: p.body,
        createdAt: p.created_at,
        authorDisplayName: p.author_display_name,
        score: Number(p.score),
        userVote: p.user_vote,
        attachments: atts.map((a) => ({
          id: a.id,
          mimeType: a.mime_type,
          url: `/api/files/${a.id}`,
        })),
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
