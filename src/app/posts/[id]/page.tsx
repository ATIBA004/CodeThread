"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Me } from "@/components/AppNav";
import { ContentBody } from "@/components/ContentBody";
import { ImageAttachField } from "@/components/ImageAttachField";
import { PageShell } from "@/components/PageShell";
import { ReplyThread, type ReplyNode } from "@/components/ReplyThread";
import { VoteButtons } from "@/components/VoteButtons";
import { apiJson } from "@/lib/fetcher";

type PostPayload = {
  id: number;
  channelId: number;
  channelName: string;
  title: string;
  body: string;
  createdAt: string;
  authorDisplayName: string;
  score: number;
  userVote: number | null;
  attachments: { id: number; mimeType: string; url: string }[];
};

export default function PostDetailPage() {
  const params = useParams();
  const postId = Number(params.id);
  const [me, setMe] = useState<Me>(null);
  const [post, setPost] = useState<PostPayload | null>(null);
  const [replies, setReplies] = useState<ReplyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topBody, setTopBody] = useState("");
  const [topReplyFiles, setTopReplyFiles] = useState<File[]>([]);
  const topReplyFileRef = useRef<HTMLInputElement>(null);
  const [topBusy, setTopBusy] = useState(false);
  const [topErr, setTopErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!Number.isFinite(postId)) return;
    setLoading(true);
    setError(null);
    const [pr, rr] = await Promise.all([
      apiJson<{ post: PostPayload }>(`/api/posts/${postId}`),
      apiJson<{ replies: ReplyNode[] }>(`/api/posts/${postId}/replies`),
    ]);
    setLoading(false);
    if (!pr.ok) {
      setError(pr.message);
      setPost(null);
      return;
    }
    if (!rr.ok) {
      setError(rr.message);
      return;
    }
    setPost(pr.data.post);
    setReplies(rr.data.replies);
  }, [postId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (typeof window === "undefined" || !post) return;
    const hash = window.location.hash;
    if (hash.startsWith("#reply-")) {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [post, replies]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = (await r.json()) as {
        user: { id: number; displayName: string; role: "user" | "admin" } | null;
      };
      setMe(
        j.user
          ? {
              id: j.user.id,
              displayName: j.user.displayName,
              role: j.user.role,
            }
          : null,
      );
    })();
  }, []);

  async function submitTopReply(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setTopErr(null);
    setTopBusy(true);
    const res = await apiJson<{ id: number }>(`/api/posts/${postId}/replies`, {
      method: "POST",
      body: JSON.stringify({ body: topBody, parentReplyId: null }),
    });
    if (!res.ok) {
      setTopBusy(false);
      setTopErr(res.message);
      return;
    }
    const replyId = res.data.id;
    const files = [...topReplyFiles];
    for (const file of files) {
      const fd = new FormData();
      fd.set("targetType", "reply");
      fd.set("targetId", String(replyId));
      fd.set("file", file);
      await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
    }
    setTopBusy(false);
    setTopBody("");
    setTopReplyFiles([]);
    if (topReplyFileRef.current) topReplyFileRef.current.value = "";
    await loadAll();
  }

  if (!Number.isFinite(postId)) {
    return (
      <PageShell>
        <p className="text-[var(--danger)]">Invalid post.</p>
      </PageShell>
    );
  }

  const isOwnPost =
    me != null && post != null && me.displayName === post.authorDisplayName;
  const canVotePost = me && post && !isOwnPost;

  return (
    <PageShell>
      {loading && !post ? (
        <p className="text-[var(--muted)]" role="status">
          Loading post…
        </p>
      ) : error ? (
        <p className="text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : post ? (
        <>
          <nav className="text-sm text-[var(--muted)]" aria-label="Breadcrumb">
            <Link href="/channels" className="font-medium">
              Channels
            </Link>
            <span aria-hidden="true"> / </span>
            <Link href={`/channels/${post.channelId}`} className="font-medium">
              {post.channelName}
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-[var(--foreground)]">{post.title}</span>
          </nav>
          <article className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <header className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  {post.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  By{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {post.authorDisplayName}
                  </span>{" "}
                  ·{" "}
                  <time dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleString()}
                  </time>
                </p>
              </div>
              <VoteButtons
                targetType="post"
                targetId={post.id}
                initialScore={post.score}
                initialUserVote={post.userVote}
                disabled={!canVotePost}
                disabledReason={
                  !me
                    ? "Sign in to vote"
                    : isOwnPost
                      ? "You cannot vote on your own content"
                      : undefined
                }
              />
            </header>
            <div className="mt-4">
              <ContentBody text={post.body} />
            </div>
            {post.attachments.length ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {post.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded border border-[var(--border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.url}
                        alt=""
                        className="max-h-48 max-w-full object-contain"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {me ? (
              <div className="mt-4">
                <ImageAttachField
                  id={`post-image-${post.id}`}
                  buttonLabel="Attach image to this post"
                  hint="PNG, JPEG, or WebP. Max 5MB."
                  hintId={`post-image-hint-${post.id}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("targetType", "post");
                    fd.set("targetId", String(post.id));
                    fd.set("file", file);
                    await fetch("/api/uploads", {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    await loadAll();
                  }}
                />
              </div>
            ) : null}
          </article>

          <section className="mt-10" aria-labelledby="replies-heading">
            <h2 id="replies-heading" className="text-xl font-semibold">
              Replies
            </h2>
            {!me ? (
              <div
                className="mt-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm"
                role="status"
              >
                <p className="font-semibold text-[var(--foreground)]">
                  Access denied
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  Sign in to reply to this post.
                </p>
              </div>
            ) : (
              <form className="mt-4 max-w-2xl space-y-3" onSubmit={submitTopReply}>
                <label htmlFor="top-reply" className="block text-sm font-medium">
                  Your reply
                </label>
                <textarea
                  id="top-reply"
                  required
                  rows={4}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  value={topBody}
                  onChange={(e) => setTopBody(e.target.value)}
                />
                <ImageAttachField
                  ref={topReplyFileRef}
                  id="top-reply-images"
                  buttonLabel="Attach images (optional)"
                  hint="PNG, JPEG, or WebP. Max 5MB per file. Multiple files allowed."
                  hintId="top-reply-images-hint"
                  multiple
                  disabled={topBusy}
                  onChange={(e) => {
                    const list = e.target.files;
                    setTopReplyFiles(list ? Array.from(list) : []);
                  }}
                />
                {topReplyFiles.length > 0 ? (
                  <p className="text-xs text-[var(--muted)]" role="status">
                    {topReplyFiles.length} file
                    {topReplyFiles.length === 1 ? "" : "s"} selected
                  </p>
                ) : null}
                {topErr ? (
                  <p className="text-sm text-[var(--danger)]" role="alert">
                    {topErr}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={topBusy}
                  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
                >
                  {topBusy ? "Posting…" : "Post reply"}
                </button>
              </form>
            )}
            <div className="mt-6">
              <ReplyThread replies={replies} me={me} onRefresh={loadAll} />
            </div>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
