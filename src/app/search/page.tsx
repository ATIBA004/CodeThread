"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { apiJson } from "@/lib/fetcher";

type Mode = "substring" | "author" | "most_posts" | "least_posts" | "ranked";

type ResultRow = {
  kind: string;
  id?: number;
  userId?: number;
  href: string;
  snippet: string;
  title?: string | null;
  authorDisplayName?: string;
  displayName?: string;
  postCount?: number;
  score?: number;
};

export default function SearchPage() {
  const [mode, setMode] = useState<Mode>("substring");
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState("");
  const [rankOrder, setRankOrder] = useState<"highest" | "lowest">("highest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const runSearch = useCallback(
    async (p: number, append = false) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("mode", mode);
      params.set("page", String(p));
      params.set("pageSize", "15");
      if (mode === "substring") params.set("q", q);
      if (mode === "author") params.set("author", author);
      if (mode === "ranked") params.set("order", rankOrder);
      const res = await apiJson<{
        results: ResultRow[];
        totalPages: number;
      }>(`/api/search?${params.toString()}`);
      setLoading(false);
      if (!res.ok) {
        setError(res.message);
        if (!append) setResults([]);
        return;
      }
      setPage(p);
      setTotalPages(res.data.totalPages);
      setResults((prev) =>
        append ? [...prev, ...res.data.results] : res.data.results,
      );
    },
    [mode, q, author, rankOrder],
  );

  useEffect(() => {
    setPage(1);
    setResults([]);
    setTotalPages(1);
  }, [mode]);

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Search</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Use the tabs to switch query types. Substring and author searches include
        contextual snippets and links to the original post or reply. See the
        README for indexed fields and how ranking works for the &quot;ranked&quot;
        mode.
      </p>

      <div
        className="mt-6 flex flex-wrap gap-2 border-b border-[var(--border)] pb-2"
        role="tablist"
        aria-label="Search mode"
      >
        {(
          [
            ["substring", "Substring"],
            ["author", "By author"],
            ["most_posts", "Most posts"],
            ["least_posts", "Least posts"],
            ["ranked", "Ranked content"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              mode === m
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
            }`}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(1);
        }}
      >
        {mode === "substring" ? (
          <div>
            <label htmlFor="search-q" className="block text-sm font-medium">
              Search text (min 2 characters)
            </label>
            <input
              id="search-q"
              className="mt-1 w-full max-w-xl rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              minLength={2}
              required
            />
          </div>
        ) : null}
        {mode === "author" ? (
          <div>
            <label htmlFor="search-author" className="block text-sm font-medium">
              Author display name (partial match)
            </label>
            <input
              id="search-author"
              className="mt-1 w-full max-w-xl rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
            />
          </div>
        ) : null}
        {mode === "ranked" ? (
          <fieldset>
            <legend className="text-sm font-medium">Order by net score</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="rank"
                  checked={rankOrder === "highest"}
                  onChange={() => setRankOrder("highest")}
                />
                Highest first
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="rank"
                  checked={rankOrder === "lowest"}
                  onChange={() => setRankOrder("lowest")}
                />
                Lowest first
              </label>
            </div>
          </fieldset>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mt-6 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-8" aria-live="polite">
        <h2 className="text-lg font-semibold">Results</h2>
        {!loading && results.length === 0 && !error ? (
          <p className="mt-3 text-[var(--muted)]" role="status">
            Run a search to see results. For &quot;most/least posts&quot;, press
            Search without extra fields.
          </p>
        ) : null}
        {loading && results.length === 0 ? (
          <p className="mt-3 text-[var(--muted)]" role="status">
            Loading…
          </p>
        ) : null}
        <ol className="mt-4 space-y-4">
          {results.map((r, i) => (
            <li
              key={`${r.kind}-${r.id ?? r.userId ?? r.href}-${i}`}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-[var(--background)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {r.kind.replace("_", " ")}
                </span>
                {r.score != null ? (
                  <span className="text-sm font-mono text-[var(--foreground)]">
                    score {r.score > 0 ? `+${r.score}` : r.score}
                  </span>
                ) : null}
                {r.postCount != null ? (
                  <span className="text-sm text-[var(--foreground)]">
                    {r.postCount} posts
                  </span>
                ) : null}
              </div>
              {r.title ? (
                <p className="mt-2 font-semibold text-[var(--foreground)]">
                  {r.title}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-[var(--muted)]">{r.snippet}</p>
              {(r.authorDisplayName || r.displayName) && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Author: {r.authorDisplayName ?? r.displayName}
                </p>
              )}
              <Link
                href={r.href}
                className="mt-3 inline-block text-sm font-medium"
              >
                Open content
                <span className="sr-only"> (navigate to original)</span>
              </Link>
            </li>
          ))}
        </ol>
        {page < totalPages ? (
          <button
            type="button"
            className="mt-6 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium"
            disabled={loading}
            onClick={() => runSearch(page + 1, true)}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </section>
    </PageShell>
  );
}
