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
    const rl = rateLimit(clientKey(req.headers, "login"), 30, 15 * 60 * 1000);
    if (!rl.ok) {
      return jsonError(
        429,
        `Too many login attempts. Try again in ${rl.retryAfterSec}s.`,
      );
    }
    const json = await req.json();
    const { displayName, password } = bodySchema.parse(json);
    const name = sanitizeUserText(displayName);
    const { rows } = await query<{
      id: number;
      password_hash: string;
    }>(`SELECT id, password_hash FROM users WHERE display_name = $1`, [name]);
    const row = rows[0];
    const ok = row ? await bcrypt.compare(password, row.password_hash) : false;
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      return jsonError(401, "Invalid display name or password");
    }
    const session = await getSession();
    session.userId = row!.id;
    await session.save();
    return NextResponse.json({ ok: true, userId: row!.id });
  } catch (e) {
    return handleRouteError(e);
  }
}
