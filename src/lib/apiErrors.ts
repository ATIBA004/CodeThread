import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(e: unknown) {
  if (e instanceof ZodError) {
    const msg = e.issues.map((i) => i.message).join("; ");
    return jsonError(400, msg);
  }
  if (e && typeof e === "object" && "status" in e) {
    const status = (e as { status: number }).status;
    if (status === 401) return jsonError(401, "Unauthorized");
    if (status === 403) return jsonError(403, "Forbidden");
  }
  console.error(e);
  return jsonError(500, "Internal server error");
}
