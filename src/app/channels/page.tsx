"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { apiJson } from "@/lib/fetcher";

type Channel = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  createdByDisplayName: string;
  postCount: number;
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [me, setMe] = useState<{ displayName: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await apiJson<{ channels: Channel[] }>("/api/channels");
    if (!res.ok) {
      setError(res.message);
      setChannels([]);
      return;
    }
    setChannels(res.data.channels);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await r.json()) as {
        user: { displayName: string } | null;
      };
      setMe(j.user);
    })();
  }, []);

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setCreateBusy(true);
    const res = await apiJson<{ id: number }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    setCreateBusy(false);
    if (!res.ok) {
      setCreateErr(res.message);
      return;
    }
    setName("");
    setDescription("");
    await load();
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Channels</h1>
      <p className="mt-2 text-[var(--muted)]">
        Browse existing channels or create a new one when signed in.
      </p>

      <section className="mt-8" aria-labelledby="create-heading">
        <h2 id="create-heading" className="text-lg font-semibold">
          Create channel
        </h2>
        {!me ? (
          <div
            className="mt-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--foreground)]"
            role="status"
          >
            <p className="font-semibold">Access denied</p>
            <p className="mt-1 text-[var(--muted)]">
              You must be signed in to create a channel. Use{" "}
              <Link href="/sign-in" className="font-medium">
                Sign In
              </Link>{" "}
              or{" "}
              <Link href="/sign-up" className="font-medium">
                Sign Up
              </Link>
              .
            </p>
          </div>
        ) : (
          <form className="mt-3 max-w-lg space-y-3" onSubmit={createChannel}>
            <div>
              <label htmlFor="ch-name" className="block text-sm font-medium">
                Name
              </label>
              <input
                id="ch-name"
                required
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ch-desc" className="block text-sm font-medium">
                Description
              </label>
              <textarea
                id="ch-desc"
                rows={3}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {createErr ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {createErr}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={createBusy}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
            >
              {createBusy ? "Creating…" : "Create channel"}
            </button>
          </form>
        )}
      </section>

      <section className="mt-10" aria-labelledby="list-heading">
        <h2 id="list-heading" className="text-lg font-semibold">
          All channels
        </h2>
        {channels === null ? (
          <p className="mt-4 text-[var(--muted)]" role="status">
            Loading channels…
          </p>
        ) : error ? (
          <p className="mt-4 text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : channels.length === 0 ? (
          <p className="mt-4 text-[var(--muted)]" role="status">
            No channels yet. Create the first one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {channels.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/channels/${c.id}`}
                  className="block rounded-md border border-[var(--border)] bg-[var(--card)] p-4 no-underline hover:ring-2 hover:ring-[var(--accent)]"
                >
                  <span className="text-lg font-semibold text-[var(--foreground)]">
                    {c.name}
                  </span>
                  <span className="ml-2 text-sm text-[var(--muted)]">
                    ({c.postCount} posts)
                  </span>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {c.description || "No description"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Created by {c.createdByDisplayName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
