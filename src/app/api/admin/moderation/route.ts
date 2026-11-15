import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/apiErrors";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const [{ rows: users }, { rows: channels }, { rows: posts }, { rows: replies }] =
      await Promise.all([
        query<{
          id: number;
          display_name: string;
          role: string;
        }>(
          `SELECT id, display_name, role FROM users ORDER BY id ASC LIMIT 200`,
        ),
        query<{ id: number; name: string }>(
          `SELECT id, name FROM channels ORDER BY id ASC LIMIT 200`,
        ),
        query<{
          id: number;
          title: string;
          channel_id: number;
          channel_name: string;
          author_display_name: string;
        }>(
          `SELECT p.id, p.title, p.channel_id, c.name AS channel_name,
                  u.display_name AS author_display_name
           FROM posts p
           JOIN channels c ON c.id = p.channel_id
           JOIN users u ON u.id = p.author_id
           ORDER BY p.created_at DESC
           LIMIT 200`,
        ),
        query<{
          id: number;
          post_id: number;
          body: string;
          author_display_name: string;
        }>(
          `SELECT r.id, r.post_id, r.body, u.display_name AS author_display_name
           FROM replies r
           JOIN users u ON u.id = r.author_id
           ORDER BY r.created_at DESC
           LIMIT 200`,
        ),
      ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        displayName: u.display_name,
        role: u.role,
      })),
      channels: channels.map((c) => ({ id: c.id, name: c.name })),
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        channelId: p.channel_id,
        channelName: p.channel_name,
        authorDisplayName: p.author_display_name,
      })),
      replies: replies.map((r) => ({
        id: r.id,
        postId: r.post_id,
        excerpt:
          r.body.length > 120 ? `${r.body.slice(0, 120)}…` : r.body,
        authorDisplayName: r.author_display_name,
      })),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
