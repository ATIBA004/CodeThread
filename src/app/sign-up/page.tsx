"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { apiJson } from "@/lib/fetcher";

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiJson<{ ok: boolean }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ displayName, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push("/channels");
    router.refresh();
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Sign up</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium">
          Sign in
        </Link>
        .
      </p>
      <form
        className="mt-6 max-w-md space-y-4"
        onSubmit={onSubmit}
        aria-busy={loading}
      >
        <div>
          <label htmlFor="signup-display" className="block text-sm font-medium">
            Display name
          </label>
          <input
            id="signup-display"
            name="displayName"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium">
            Password (min 8 characters)
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </PageShell>
  );
}
