"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageAttachField } from "@/components/ImageAttachField";
import { PageShell } from "@/components/PageShell";
import { apiJson } from "@/lib/fetcher";

type Post = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  authorDisplayName: string;
  score: number;
  userVote: number | null;
};

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [channel, setChannel] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<{ displayName: string } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);

  const loadChannel = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const res = await apiJson<{
      channel: { name: string; description: string };
    }>(`/api/channels/${id}`);
    if (!res.ok) {
      setErr(res.message);
      setChannel(null);
      return;
    }
    setChannel(res.data.channel);
  }, [id]);

  const loadPosts = useCallback(
    async (p: number, append: boolean) => {
      if (!Number.isFinite(id)) return;
      setLoading(true);
      setErr(null);
      const res = await apiJson<{
        posts: Post[];
        page: number;
        totalPages: number;
      }>(`/api/channels/${id}/posts?page=${p}&pageSize=15`);
      setLoading(false);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setPage(res.data.page);
      setTotalPages(res.data.totalPages);
      setPosts((prev) => (append ? [...prev, ...res.data.posts] : res.data.posts));
    },
    [id],
  );

  useEffect(() => {
    loadChannel();
  }, [loadChannel]);

  useEffect(() => {
    if (Number.isFinite(id)) loadPosts(1, false);
  }, [id, loadPosts]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await r.json()) as {
        user: { displayName: string } | null;
      };
      setMe(j.user);
    })();
  }, []);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setPostErr(null);
    setPostBusy(true);
    const res = await apiJson<{ id: number }>(`/api/channels/${id}/posts`, {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      setPostBusy(false);
      setPostErr(res.message);
      return;
    }
    const postId = res.data.id;
    const files = [...postFiles];
    const uploadErrors: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("targetType", "post");
      fd.set("targetId", String(postId));
      fd.set("file", file);
      const up = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!up.ok) {
        let msg = "Upload failed";
        try {
          const j = (await up.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        uploadErrors.push(`${file.name}: ${msg}`);
      }
    }
    setPostBusy(false);
    setTitle("");
    setBody("");
    setPostFiles([]);
    if (postFileInputRef.current) postFileInputRef.current.value = "";
    await loadPosts(1, false);
    if (uploadErrors.length) {
      setPostErr(
        `Post published, but some images failed: ${uploadErrors.join(
          "; ",
        )} You can open the post from the list below and attach images there.`,
      );
      return;
    }
    router.push(`/posts/${postId}`);
  }

  if (!Number.isFinite(id)) {
    return (
      <PageShell>
        <p className="text-[var(--danger)]">Invalid channel.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
        <Link href="/channels" className="font-medium">
          Channels
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-[var(--foreground)]">{channel?.name ?? "…"}</span>
      </nav>
      {channel ? (
        <>
          <h1 className="mt-4 text-2xl font-bold">{channel.name}</h1>
          <p className="mt-2 text-[var(--muted)]">{channel.description}</p>
        </>
      ) : err && !loading ? (
        <p className="mt-4 text-[var(--danger)]" role="alert">
          {err}
        </p>
      ) : (
        <p className="mt-4 text-[var(--muted)]" role="status">
          Loading channel…
        </p>
      )}

      <section className="mt-8" aria-labelledby="new-post">
        <h2 id="new-post" className="text-lg font-semibold">
          New post
        </h2>
        {!me ? (
          <div
            className="mt-3 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm"
            role="status"
          >
            <p className="font-semibold text-[var(--foreground)]">Access denied</p>
            <p className="mt-1 text-[var(--muted)]">
              Sign in to create a post in this channel.
            </p>
          </div>
        ) : (
          <form className="mt-3 max-w-lg space-y-3" onSubmit={createPost}>
            <div>
              <label htmlFor="post-title" className="block text-sm font-medium">
                Title
              </label>
              <input
                id="post-title"
                required
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="post-body" className="block text-sm font-medium">
                Body
              </label>
              <textarea
                id="post-body"
                required
                rows={5}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div>
              <ImageAttachField
                ref={postFileInputRef}
                id="post-images"
                buttonLabel="Attach images (optional)"
                hint="PNG, JPEG, or WebP. Max 5MB per file. You can select multiple files."
                hintId="post-images-hint"
                multiple
                onChange={(e) => {
                  const list = e.target.files;
                  setPostFiles(list ? Array.from(list) : []);
                }}
              />
              {postFiles.length > 0 ? (
                <p className="text-xs text-[var(--muted)]" role="status">
                  {postFiles.length} file{postFiles.length === 1 ? "" : "s"}{" "}
                  selected
                </p>
              ) : null}
            </div>
            {postErr ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {postErr}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={postBusy}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
            >
              {postBusy ? "Publishing…" : "Publish post"}
            </button>
          </form>
        )}
      </section>

      <section className="mt-10" aria-labelledby="posts-list">
        <h2 id="posts-list" className="text-lg font-semibold">
          Posts
        </h2>
        {loading && posts.length === 0 ? (
          <p className="mt-4 text-[var(--muted)]" role="status">
            Loading posts…
          </p>
        ) : posts.length === 0 ? (
          <p className="mt-4 text-[var(--muted)]" role="status">
            No posts in this channel yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/posts/${p.id}`}
                  className="block rounded-md border border-[var(--border)] bg-[var(--card)] p-4 no-underline hover:ring-2 hover:ring-[var(--accent)]"
                >
                  <span className="text-lg font-semibold text-[var(--foreground)]">
                    {p.title}
                  </span>
                  <span className="ml-2 text-sm text-[var(--muted)]">
                    score {p.score > 0 ? `+${p.score}` : p.score}
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {p.body}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    By {p.authorDisplayName} ·{" "}
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {page < totalPages ? (
          <button
            type="button"
            className="mt-4 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium"
            disabled={loading}
            onClick={() => loadPosts(page + 1, true)}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </section>
    </PageShell>
  );
}
