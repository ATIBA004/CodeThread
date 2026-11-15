"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { apiJson } from "@/lib/fetcher";
import type { Me } from "./AppNav";
import { ContentBody } from "./ContentBody";
import { ImageAttachField } from "./ImageAttachField";
import { VoteButtons } from "./VoteButtons";

export type ReplyNode = {
  id: number;
  postId: number;
  parentReplyId: number | null;
  authorDisplayName: string;
  body: string;
  createdAt: string;
  score: number;
  userVote: number | null;
  attachments: { id: number; mimeType: string; url: string }[];
  children: ReplyNode[];
};

function ReplyCard({
  node,
  me,
  onReplied,
  depth,
}: {
  node: ReplyNode;
  me: Me;
  onReplied: () => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [nestFiles, setNestFiles] = useState<File[]>([]);
  const nestFileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isOwn = me?.id != null && me.displayName === node.authorDisplayName;
  const canVote = me && !isOwn;
  const voteDisabledReason = !me
    ? "Sign in to vote"
    : isOwn
      ? "You cannot vote on your own content"
      : undefined;

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setErr(null);
    setBusy(true);
    const res = await apiJson<{ id: number }>(`/api/posts/${node.postId}/replies`, {
      method: "POST",
      body: JSON.stringify({ body, parentReplyId: node.id }),
    });
    if (!res.ok) {
      setBusy(false);
      setErr(res.message);
      return;
    }
    const newReplyId = res.data.id;
    const files = [...nestFiles];
    for (const file of files) {
      const fd = new FormData();
      fd.set("targetType", "reply");
      fd.set("targetId", String(newReplyId));
      fd.set("file", file);
      await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
    }
    setBusy(false);
    setBody("");
    setNestFiles([]);
    if (nestFileRef.current) nestFileRef.current.value = "";
    setOpen(false);
    onReplied();
  }

  const pad = Math.min(depth * 16, 80);

  return (
    <li
      id={`reply-${node.id}`}
      className="scroll-mt-24 border-l-2 border-[var(--border)] pl-3"
      style={{ marginLeft: pad }}
    >
      <article className="rounded-md bg-[var(--card)] p-3 shadow-sm ring-1 ring-[var(--border)]">
        <header className="mb-2 flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-[var(--muted)]">
              <span className="font-medium text-[var(--foreground)]">
                {node.authorDisplayName}
              </span>{" "}
              <time dateTime={node.createdAt}>
                {new Date(node.createdAt).toLocaleString()}
              </time>
            </p>
          </div>
          <VoteButtons
            targetType="reply"
            targetId={node.id}
            initialScore={node.score}
            initialUserVote={node.userVote}
            disabled={!canVote}
            disabledReason={voteDisabledReason}
          />
        </header>
        <ContentBody text={node.body} />
        {node.attachments.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {node.attachments.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.url}
                  className="block overflow-hidden rounded border border-[var(--border)]"
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt=""
                    width={160}
                    height={120}
                    className="max-h-32 max-w-[200px] object-contain"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {me ? (
          <div className="mt-2">
            <button
              type="button"
              className="text-sm font-medium text-[var(--accent)] underline"
              onClick={() => {
                setOpen((v) => !v);
                if (open) {
                  setNestFiles([]);
                  if (nestFileRef.current) nestFileRef.current.value = "";
                }
              }}
              aria-expanded={open}
            >
              {open ? "Cancel reply" : "Reply"}
            </button>
            {open ? (
              <form className="mt-2 space-y-2" onSubmit={submitReply}>
                <label htmlFor={`reply-body-${node.id}`} className="sr-only">
                  Reply body
                </label>
                <textarea
                  id={`reply-body-${node.id}`}
                  required
                  rows={3}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  aria-label="Reply body"
                />
                <ImageAttachField
                  ref={nestFileRef}
                  id={`nested-reply-files-${node.id}`}
                  buttonLabel="Attach images (optional)"
                  hint="PNG, JPEG, or WebP. Max 5MB per file. Multiple files allowed."
                  hintId={`nested-reply-hint-${node.id}`}
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    const list = e.target.files;
                    setNestFiles(list ? Array.from(list) : []);
                  }}
                />
                {nestFiles.length > 0 ? (
                  <p className="text-xs text-[var(--muted)]" role="status">
                    {nestFiles.length} file
                    {nestFiles.length === 1 ? "" : "s"} selected
                  </p>
                ) : null}
                {err ? (
                  <p className="text-sm text-[var(--danger)]" role="alert">
                    {err}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-contrast)] disabled:opacity-60"
                >
                  {busy ? "Posting…" : "Post reply"}
                </button>
              </form>
            ) : null}
            <ReplyUpload me={me} replyId={node.id} onUploaded={onReplied} />
          </div>
        ) : null}
      </article>
      {node.children.length ? (
        <ol className="mt-3 space-y-3">
          {node.children.map((c) => (
            <ReplyCard
              key={c.id}
              node={c}
              me={me}
              onReplied={onReplied}
              depth={depth + 1}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function ReplyUpload({
  me,
  replyId,
  onUploaded,
}: {
  me: Me;
  replyId: number;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!me) return null;

  return (
    <div className="mt-2">
      <ImageAttachField
        id={`upload-reply-${replyId}`}
        buttonLabel="Add image to this reply"
        hint="PNG, JPEG, or WebP. Max 5MB. For your own replies only."
        hintId={`upload-reply-hint-${replyId}`}
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setMsg(null);
          setBusy(true);
          const fd = new FormData();
          fd.set("targetType", "reply");
          fd.set("targetId", String(replyId));
          fd.set("file", file);
          const res = await fetch("/api/uploads", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          const text = await res.text();
          setBusy(false);
          if (!res.ok) {
            try {
              const j = JSON.parse(text) as { error?: string };
              setMsg(j.error ?? "Upload failed");
            } catch {
              setMsg("Upload failed");
            }
            return;
          }
          setMsg("Uploaded.");
          onUploaded();
        }}
      />
      {msg ? (
        <p className="mt-1 text-sm text-[var(--muted)]" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export function ReplyThread({
  replies,
  me,
  onRefresh,
}: {
  replies: ReplyNode[];
  me: Me;
  onRefresh: () => void;
}) {
  const key = useMemo(
    () => replies.map((r) => r.id).join(","),
    [replies],
  );

  if (!replies.length) {
    return (
      <p className="text-[var(--muted)]" role="status">
        No replies yet. Be the first to reply.
      </p>
    );
  }

  return (
    <ol className="space-y-3" key={key}>
      {replies.map((r) => (
        <ReplyCard
          key={r.id}
          node={r}
          me={me}
          onReplied={onRefresh}
          depth={0}
        />
      ))}
    </ol>
  );
}
