"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { apiJson } from "@/lib/fetcher";

type Snapshot = {
  users: { id: number; displayName: string; role: string }[];
  channels: { id: number; name: string }[];
  posts: {
    id: number;
    title: string;
    channelId: number;
    channelName: string;
    authorDisplayName: string;
  }[];
  replies: {
    id: number;
    postId: number;
    excerpt: string;
    authorDisplayName: string;
  }[];
};

export default function AdminPage() {
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiJson<Snapshot>("/api/admin/moderation");
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      setSnap(null);
      return;
    }
    setSnap(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await r.json()) as { user: { role: string } | null };
      setMe(j.user);
    })();
  }, []);

  useEffect(() => {
    if (me?.role === "admin") load();
    else {
      setLoading(false);
    }
  }, [me, load]);

  async function del(
    path: string,
    label: string,
  ) {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setMsg(null);
    const res = await fetch(path, { method: "DELETE", credentials: "include" });
    const text = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(text) as { error?: string };
        setMsg(j.error ?? "Delete failed");
      } catch {
        setMsg("Delete failed");
      }
      return;
    }
    setMsg("Deleted.");
    await load();
  }

  if (me && me.role !== "admin") {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--foreground)]">
          Access denied. This area is restricted to administrators.
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          <Link href="/channels">Back to channels</Link>
        </p>
      </PageShell>
    );
  }

  if (!me) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-4">
          <span className="font-semibold text-[var(--foreground)]">
            Access denied
          </span>
          <span className="mt-2 block text-[var(--muted)]">
            Sign in as an administrator to manage users and content.
          </span>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Delete users, channels, posts, and replies. Only administrators can use
        these controls.
      </p>
      {msg ? (
        <p className="mt-4 text-sm text-[var(--ok)]" role="status">
          {msg}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-6 text-[var(--muted)]" role="status">
          Loading moderation data…
        </p>
      ) : error ? (
        <p className="mt-6 text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : snap ? (
        <div className="mt-8 space-y-10">
          <section aria-labelledby="adm-users">
            <h2 id="adm-users" className="text-lg font-semibold">
              Users
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {snap.users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{u.displayName}</span>{" "}
                    <span className="text-xs text-[var(--muted)]">({u.role})</span>
                  </span>
                  <button
                    type="button"
                    className="rounded border border-[var(--danger)] px-2 py-1 text-xs font-semibold text-[var(--danger)]"
                    onClick={() =>
                      del(`/api/admin/users/${u.id}`, `user ${u.displayName}`)
                    }
                  >
                    Delete user
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="adm-ch">
            <h2 id="adm-ch" className="text-lg font-semibold">
              Channels
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {snap.channels.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <span className="font-medium">{c.name}</span>
                  <button
                    type="button"
                    className="rounded border border-[var(--danger)] px-2 py-1 text-xs font-semibold text-[var(--danger)]"
                    onClick={() =>
                      del(`/api/admin/channels/${c.id}`, `channel ${c.name}`)
                    }
                  >
                    Delete channel
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="adm-posts">
            <h2 id="adm-posts" className="text-lg font-semibold">
              Recent posts
            </h2>
            <ul className="mt-3 space-y-2">
              {snap.posts.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <Link href={`/posts/${p.id}`} className="font-medium">
                      {p.title}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {p.channelName} · {p.authorDisplayName}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-[var(--danger)] px-2 py-1 text-xs font-semibold text-[var(--danger)]"
                    onClick={() => del(`/api/admin/posts/${p.id}`, `post #${p.id}`)}
                  >
                    Delete post
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="adm-replies">
            <h2 id="adm-replies" className="text-lg font-semibold">
              Recent replies
            </h2>
            <ul className="mt-3 space-y-2">
              {snap.replies.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="text-sm text-[var(--foreground)]">{r.excerpt}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Post #{r.postId} · {r.authorDisplayName} ·{" "}
                      <Link href={`/posts/${r.postId}#reply-${r.id}`}>Open</Link>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-[var(--danger)] px-2 py-1 text-xs font-semibold text-[var(--danger)]"
                    onClick={() =>
                      del(`/api/admin/replies/${r.id}`, `reply #${r.id}`)
                    }
                  >
                    Delete reply
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
