import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { buildReplyTree, type ReplyRow } from "@/lib/replyTree";
import { sanitizeUserText } from "@/lib/sanitize";
import { replyBodySchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: raw } = await context.params;
    const postId = Number(raw);
    if (!Number.isFinite(postId)) return jsonError(400, "Invalid post id");
    const user = await getCurrentUser();
    const uid = user?.id ?? -1;

    const { rows: exists } = await query(`SELECT 1 FROM posts WHERE id = $1`, [
      postId,
    ]);
    if (!exists.length) return jsonError(404, "Post not found");

    const { rows } = await query<{
      id: number;
      post_id: number;
      parent_reply_id: number | null;
      author_id: number;
      display_name: string;
      body: string;
      created_at: string;
      score: string;
      user_vote: number | null;
    }>(
      `SELECT r.id, r.post_id, r.parent_reply_id, r.author_id, u.display_name,
              r.body, r.created_at::text,
              COALESCE((
                SELECT SUM(v.value)::text FROM votes v
                WHERE v.target_type = 'reply' AND v.target_id = r.id
              ), '0') AS score,
              (SELECT vx.value FROM votes vx
               WHERE vx.target_type = 'reply' AND vx.target_id = r.id
                 AND vx.user_id = $2
               LIMIT 1) AS user_vote
       FROM replies r
       JOIN users u ON u.id = r.author_id
       WHERE r.post_id = $1
       ORDER BY r.created_at ASC`,
      [postId, uid],
    );

    const ids = rows.map((r) => r.id);
    const attMap = new Map<number, { id: number; mime_type: string }[]>();
    if (ids.length) {
      const { rows: atts } = await query<{
        id: number;
        target_id: number;
        mime_type: string;
      }>(
        `SELECT id, target_id, mime_type FROM attachments
         WHERE target_type = 'reply' AND target_id = ANY($1::int[])
         ORDER BY id ASC`,
        [ids],
      );
      for (const a of atts) {
        const list = attMap.get(a.target_id) ?? [];
        list.push({ id: a.id, mime_type: a.mime_type });
        attMap.set(a.target_id, list);
      }
    }

    const replyRows: ReplyRow[] = rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      parent_reply_id: r.parent_reply_id,
      author_id: r.author_id,
      display_name: r.display_name,
      body: r.body,
      created_at: r.created_at,
      score: Number(r.score),
      user_vote: r.user_vote,
      attachments: attMap.get(r.id) ?? [],
    }));

    const tree = buildReplyTree(replyRows);

    function mapNode(n: (typeof tree)[0]): object {
      return {
        id: n.id,
        postId: n.post_id,
        parentReplyId: n.parent_reply_id,
        authorDisplayName: n.display_name,
        body: n.body,
        createdAt: n.created_at,
        score: n.score,
        userVote: n.user_vote,
        attachments: n.attachments.map((a) => ({
          id: a.id,
          mimeType: a.mime_type,
          url: `/api/files/${a.id}`,
        })),
        children: n.children.map(mapNode),
      };
    }

    return NextResponse.json({ replies: tree.map(mapNode) });
  } catch (e) {
    return handleRouteError(e);
  }
}

const createSchema = z.object({
  body: replyBodySchema,
  parentReplyId: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest, context: Params) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`replywrite:${user.id}`, 60, 60 * 1000);
    if (!rl.ok) {
      return jsonError(
        429,
        `You are replying too quickly. Try again in ${rl.retryAfterSec}s.`,
      );
    }
    const { id: raw } = await context.params;
    const postId = Number(raw);
    if (!Number.isFinite(postId)) return jsonError(400, "Invalid post id");
    const json = await req.json();
    const parsed = createSchema.parse(json);
    const parentReplyId = parsed.parentReplyId ?? null;
    const body = sanitizeUserText(parsed.body);
    if (!body) return jsonError(400, "Body is required");

    const { rows: p } = await query(`SELECT id FROM posts WHERE id = $1`, [
      postId,
    ]);
    if (!p.length) return jsonError(404, "Post not found");

    if (parentReplyId != null) {
      const { rows: pr } = await query<{ post_id: number }>(
        `SELECT post_id FROM replies WHERE id = $1`,
        [parentReplyId],
      );
      if (!pr[0] || pr[0].post_id !== postId) {
        return jsonError(400, "parentReplyId must belong to this post");
      }
    }

    const { rows } = await query<{ id: number }>(
      `INSERT INTO replies (post_id, parent_reply_id, author_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [postId, parentReplyId, user.id, body],
    );
    const id = rows[0]?.id;
    if (id == null) return jsonError(500, "Could not create reply");
    return NextResponse.json({ id });
  } catch (e) {
    return handleRouteError(e);
  }
}
