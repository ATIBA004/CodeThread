import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/apiErrors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function uploadDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
}

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id)) return jsonError(400, "Invalid file id");

    const { rows } = await query<{
      mime_type: string;
      storage_path: string;
    }>(
      `SELECT mime_type, storage_path FROM attachments WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return jsonError(404, "Not found");

    const base = path.resolve(uploadDir());
    const resolved = path.resolve(base, row.storage_path);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      return jsonError(500, "Invalid storage path");
    }

    const data = await readFile(resolved);
    return new NextResponse(data, {
      headers: {
        "Content-Type": row.mime_type,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
