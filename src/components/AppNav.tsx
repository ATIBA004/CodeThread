"use client";

import Link from "next/link";

export type Me = {
  id: number;
  displayName: string;
  role: "user" | "admin";
} | null;

export function AppNav({ me }: { me: Me }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <nav
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3"
        aria-label="Main"
      >
        <Link
          href="/channels"
          className="font-semibold text-[var(--foreground)] no-underline focus-visible:rounded-sm"
        >
          Channels
        </Link>
        <Link
          href="/search"
          className="text-[var(--foreground)] no-underline focus-visible:rounded-sm"
        >
          Search
        </Link>
        {me?.role === "admin" ? (
          <Link
            href="/admin"
            className="text-[var(--foreground)] no-underline focus-visible:rounded-sm"
          >
            Admin
          </Link>
        ) : null}
        <span className="flex-1" />
        {me ? (
          <>
            <span className="text-sm text-[var(--muted)]" aria-live="polite">
              Signed in as{" "}
              <span className="font-medium text-[var(--foreground)]">
                {me.displayName}
              </span>
            </span>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                window.location.href = "/";
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] no-underline hover:text-[var(--accent-hover)]"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] no-underline hover:text-[var(--accent-hover)]"
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
