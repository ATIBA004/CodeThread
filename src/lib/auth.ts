import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { query } from "./db";
import { getSessionOptions } from "./session";
import type { SessionData } from "./sessionData";

export type DbUser = {
  id: number;
  display_name: string;
  role: "user" | "admin";
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function getCurrentUser(): Promise<DbUser | null> {
  const session = await getSession();
  const userId = session.userId;
  if (userId == null) return null;
  const { rows } = await query<DbUser>(
    `SELECT id, display_name, role FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<DbUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return user;
}

export async function requireAdmin(): Promise<DbUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    const err = new Error("FORBIDDEN") as Error & { status: number };
    err.status = 403;
    throw err;
  }
  return user;
}
