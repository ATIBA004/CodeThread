import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { jsonError, handleRouteError } from "@/lib/apiErrors";
import { query } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { sanitizeUserText } from "@/lib/sanitize";
import {
  displayNameSchema,
  passwordSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

const bodySchema = z.object({
  displayName: displayNameSchema,
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(clientKey(req.headers, "signup"), 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return jsonError(
        429,
        `Too many sign-up attempts. Try again in ${rl.retryAfterSec}s.`,
      );
    }
    const json = await req.json();
    const { displayName, password } = bodySchema.parse(json);
    const name = sanitizeUserText(displayName);
    if (name.length < 2) {
      return jsonError(400, "Display name must be at least 2 characters");
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query<{ id: number }>(
      `INSERT INTO users (password_hash, display_name, role)
       VALUES ($1, $2, 'user')
       RETURNING id`,
      [hash, name],
    );
    const id = rows[0]?.id;
    if (id == null) return jsonError(500, "Could not create user");
    const session = await getSession();
    session.userId = id;
    await session.save();
    return NextResponse.json({ ok: true, userId: id });
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
    ) {
      return jsonError(409, "That display name is already taken");
    }
    return handleRouteError(e);
  }
}
