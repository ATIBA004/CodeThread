export async function apiJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text || res.statusText };
  }
  if (!res.ok) {
    const msg =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: string }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    return { ok: false, status: res.status, message: msg };
  }
  return { ok: true, data: body as T };
}
