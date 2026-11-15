import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { targetTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

function extFromFilename(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

function uploadDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const targetTypeRaw = form.get("targetType");
    const targetIdRaw = form.get("targetId");
    const file = form.get("file");

    if (typeof targetTypeRaw !== "string" || typeof targetIdRaw !== "string") {
      return jsonError(400, "targetType and targetId are required");
    }
    const targetType = targetTypeSchema.parse(targetTypeRaw);
    const targetId = Number(targetIdRaw);
    if (!Number.isFinite(targetId)) return jsonError(400, "Invalid targetId");

    if (!(file instanceof File)) {
      return jsonError(400, "file is required");
    }

    const mime = (file.type || "").toLowerCase();
    const expectedExt = ALLOWED.get(mime);
    if (!expectedExt) {
      return jsonError(400, "Only PNG, JPEG, and WebP images are allowed");
    }

    const origName = file.name || "upload";
    const ext = extFromFilename(origName);
    const allowedExts = [".png", ".jpg", ".jpeg", ".webp"];
    if (!allowedExts.includes(ext)) {
      return jsonError(400, "File extension must be .png, .jpg, .jpeg, or .webp");
    }
    if (mime === "image/jpeg" && ext !== ".jpg" && ext !== ".jpeg") {
      return jsonError(400, "JPEG MIME type does not match file extension");
    }
    if (mime === "image/png" && ext !== ".png") {
      return jsonError(400, "PNG MIME type does not match file extension");
    }
    if (mime === "image/webp" && ext !== ".webp") {
      return jsonError(400, "WebP MIME type does not match file extension");
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return jsonError(400, `File too large (max ${MAX_BYTES} bytes)`);
    }

    if (targetType === "post") {
      const { rows } = await query<{ author_id: number }>(
        `SELECT author_id FROM posts WHERE id = $1`,
        [targetId],
      );
      if (!rows[0]) return jsonError(404, "Post not found");
      if (rows[0].author_id !== user.id) {
        return jsonError(403, "You can only attach files to your own posts");
      }
    } else {
      const { rows } = await query<{ author_id: number }>(
        `SELECT author_id FROM replies WHERE id = $1`,
        [targetId],
      );
      if (!rows[0]) return jsonError(404, "Reply not found");
      if (rows[0].author_id !== user.id) {
        return jsonError(403, "You can only attach files to your own replies");
      }
    }

    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}${expectedExt}`;
    const fullPath = path.join(dir, storedName);
    await writeFile(fullPath, buf);

    const { rows } = await query<{ id: number }>(
      `INSERT INTO attachments (target_type, target_id, mime_type, size_bytes, storage_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [targetType, targetId, mime, buf.length, storedName],
    );
    const id = rows[0]?.id;
    if (id == null) return jsonError(500, "Could not save attachment");
    return NextResponse.json({
      id,
      url: `/api/files/${id}`,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
