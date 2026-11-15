import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { contextualSnippet } from "@/lib/snippet";

export const runtime = "nodejs";

/**
 * Search API — see README "Search" for fields and ranking.
 *
 * Query params:
 * - mode: substring | author | most_posts | least_posts | ranked
 * - q: substring needle (mode=substring)
 * - author: display name filter (mode=author)
 * - order: highest | lowest (mode=ranked, default highest)
 * - page, pageSize (pagination; pageSize max 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "substring";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      50,
      Math.max(1, Number(searchParams.get("pageSize") || "20")),
    );
    const offset = (page - 1) * pageSize;

    if (mode === "substring") {
      const q = (searchParams.get("q") || "").trim();
      if (q.length < 2) {
        return jsonError(400, "Query q must be at least 2 characters");
      }
      const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const { rows: countRows } = await query<{ n: string }>(
        `SELECT (
           (SELECT COUNT(*) FROM posts p
            WHERE p.title ILIKE $1 ESCAPE '\\' OR p.body ILIKE $1 ESCAPE '\\') +
           (SELECT COUNT(*) FROM replies r
            WHERE r.body ILIKE $1 ESCAPE '\\')
         )::text AS n`,
        [like],
      );
      const total = Number(countRows[0]?.n ?? "0");
      const { rows } = await query<{
        kind: string;
        id: number;
        title: string | null;
        body: string;
        channel_id: number;
        post_id: number;
        author_display_name: string;
      }>(
        `WITH matched AS (
           SELECT 'post'::text AS kind, p.id, p.title, p.body, p.channel_id, p.id AS post_id,
                  u.display_name AS author_display_name, p.created_at
           FROM posts p
           JOIN users u ON u.id = p.author_id
           WHERE p.title ILIKE $1 ESCAPE '\\' OR p.body ILIKE $1 ESCAPE '\\'
           UNION ALL
           SELECT 'reply', r.id, NULL, r.body, po.channel_id, r.post_id,
                  ur.display_name, r.created_at
           FROM replies r
           JOIN posts po ON po.id = r.post_id
           JOIN users ur ON ur.id = r.author_id
           WHERE r.body ILIKE $1 ESCAPE '\\'
         )
         SELECT kind, id, title, body, channel_id, post_id, author_display_name
         FROM matched
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [like, pageSize, offset],
      );
      return NextResponse.json({
        mode,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        results: rows.map((r) => {
          const text = r.kind === "post" ? `${r.title ?? ""} ${r.body}` : r.body;
          return {
            kind: r.kind,
            id: r.id,
            title: r.title,
            snippet: contextualSnippet(text, q),
            href:
              r.kind === "post"
                ? `/posts/${r.id}`
                : `/posts/${r.post_id}#reply-${r.id}`,
            channelId: r.channel_id,
            postId: r.post_id,
            authorDisplayName: r.author_display_name,
          };
        }),
      });
    }

    if (mode === "author") {
      const author = (searchParams.get("author") || "").trim();
      if (author.length < 1) {
        return jsonError(400, "author parameter is required");
      }
      const like = `%${author.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const { rows: countRows } = await query<{ n: string }>(
        `SELECT (
           (SELECT COUNT(*) FROM posts p
            JOIN users u ON u.id = p.author_id
            WHERE u.display_name ILIKE $1 ESCAPE '\\') +
           (SELECT COUNT(*) FROM replies r
            JOIN users u ON u.id = r.author_id
            WHERE u.display_name ILIKE $1 ESCAPE '\\')
         )::text AS n`,
        [like],
      );
      const total = Number(countRows[0]?.n ?? "0");
      const { rows } = await query<{
        kind: string;
        id: number;
        title: string | null;
        body: string;
        channel_id: number;
        post_id: number;
        author_display_name: string;
      }>(
        `WITH matched AS (
           SELECT 'post'::text AS kind, p.id, p.title, p.body, p.channel_id, p.id AS post_id,
                  u.display_name AS author_display_name, p.created_at
           FROM posts p
           JOIN users u ON u.id = p.author_id
           WHERE u.display_name ILIKE $1 ESCAPE '\\'
           UNION ALL
           SELECT 'reply', r.id, NULL, r.body, po.channel_id, r.post_id,
                  ur.display_name, r.created_at
           FROM replies r
           JOIN posts po ON po.id = r.post_id
           JOIN users ur ON ur.id = r.author_id
           WHERE ur.display_name ILIKE $1 ESCAPE '\\'
         )
         SELECT kind, id, title, body, channel_id, post_id, author_display_name
         FROM matched
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [like, pageSize, offset],
      );
      return NextResponse.json({
        mode,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        results: rows.map((r) => {
          const text = r.kind === "post" ? `${r.title ?? ""} ${r.body}` : r.body;
          return {
            kind: r.kind,
            id: r.id,
            title: r.title,
            snippet: contextualSnippet(text, author),
            href:
              r.kind === "post"
                ? `/posts/${r.id}`
                : `/posts/${r.post_id}#reply-${r.id}`,
            channelId: r.channel_id,
            postId: r.post_id,
            authorDisplayName: r.author_display_name,
          };
        }),
      });
    }

    if (mode === "most_posts" || mode === "least_posts") {
      const order = mode === "most_posts" ? "DESC" : "ASC";
      const { rows: countRows } = await query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM users`,
      );
      const total = Number(countRows[0]?.n ?? "0");
      const { rows } = await query<{
        user_id: number;
        display_name: string;
        post_count: string;
      }>(
        `SELECT u.id AS user_id, u.display_name, COUNT(p.id)::text AS post_count
         FROM users u
         LEFT JOIN posts p ON p.author_id = u.id
         GROUP BY u.id
         ORDER BY COUNT(p.id) ${order}, u.display_name ASC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      );
      return NextResponse.json({
        mode,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        results: rows.map((r) => ({
          kind: "user_stats" as const,
          userId: r.user_id,
          displayName: r.display_name,
          postCount: Number(r.post_count),
          snippet: `${r.display_name} has ${r.post_count} post(s).`,
          href: `/search?mode=author&author=${encodeURIComponent(r.display_name)}`,
        })),
      });
    }

    if (mode === "ranked") {
      const order = searchParams.get("order") === "lowest" ? "ASC" : "DESC";
      const { rows: countRows } = await query<{ n: string }>(
        `SELECT (
           (SELECT COUNT(*) FROM posts) + (SELECT COUNT(*) FROM replies)
         )::text AS n`,
      );
      const total = Number(countRows[0]?.n ?? "0");
      const { rows } = await query<{
        kind: string;
        id: number;
        score: string;
        title: string | null;
        body: string;
        channel_id: number;
        post_id: number;
        author_display_name: string;
        created_at: string;
      }>(
        `WITH scored AS (
           SELECT 'post'::text AS kind, p.id,
                  COALESCE(SUM(v.value), 0)::text AS score,
                  p.title, p.body, p.channel_id, p.id AS post_id,
                  u.display_name AS author_display_name,
                  p.created_at
           FROM posts p
           JOIN users u ON u.id = p.author_id
           LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
           GROUP BY p.id, p.title, p.body, p.channel_id, p.created_at, u.display_name
           UNION ALL
           SELECT 'reply', r.id,
                  COALESCE(SUM(v.value), 0)::text,
                  NULL, r.body, po.channel_id, r.post_id,
                  ur.display_name,
                  r.created_at
           FROM replies r
           JOIN posts po ON po.id = r.post_id
           JOIN users ur ON ur.id = r.author_id
           LEFT JOIN votes v ON v.target_type = 'reply' AND v.target_id = r.id
           GROUP BY r.id, po.channel_id, r.post_id, r.body, ur.display_name, r.created_at
         )
         SELECT kind, id, score, title, body, channel_id, post_id, author_display_name, created_at
         FROM scored
         ORDER BY score::int ${order === "ASC" ? "ASC" : "DESC"}, created_at DESC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      );
      return NextResponse.json({
        mode,
        order: order === "ASC" ? "lowest" : "highest",
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        results: rows.map((r) => {
          const text = r.kind === "post" ? `${r.title ?? ""} ${r.body}` : r.body;
          return {
            kind: r.kind,
            id: r.id,
            title: r.title,
            score: Number(r.score),
            snippet: contextualSnippet(text, ""),
            href:
              r.kind === "post"
                ? `/posts/${r.id}`
                : `/posts/${r.post_id}#reply-${r.id}`,
            channelId: r.channel_id,
            postId: r.post_id,
            authorDisplayName: r.author_display_name,
          };
        }),
      });
    }

    return jsonError(400, "Invalid search mode");
  } catch (e) {
    return handleRouteError(e);
  }
}
