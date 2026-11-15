"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/fetcher";

type Props = {
  targetType: "post" | "reply";
  targetId: number;
  initialScore: number;
  initialUserVote: number | null;
  disabled?: boolean;
  disabledReason?: string;
};

export function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialUserVote,
  disabled,
  disabledReason,
}: Props) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setScore(initialScore);
    setUserVote(initialUserVote);
  }, [initialScore, initialUserVote, targetId]);

  async function vote(value: 1 | -1 | 0) {
    setError(null);
    setLoading(true);
    const res = await apiJson<{ score: number; userVote: number | null }>(
      "/api/votes",
      {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, value }),
      },
    );
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setScore(res.data.score);
    setUserVote(res.data.userVote);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2" role="group" aria-label="Vote">
        <button
          type="button"
          className="min-h-9 min-w-9 rounded border border-[var(--border)] text-lg font-semibold disabled:opacity-50"
          aria-pressed={userVote === 1}
          aria-label="Upvote"
          disabled={disabled || loading}
          onClick={() => vote(userVote === 1 ? 0 : 1)}
        >
          +
        </button>
        <span
          className="min-w-[2ch] text-center font-mono text-sm font-semibold"
          aria-live="polite"
          title="Net score"
        >
          {score > 0 ? `+${score}` : score}
        </span>
        <span className="sr-only">Net score (upvotes minus downvotes)</span>
        <button
          type="button"
          className="min-h-9 min-w-9 rounded border border-[var(--border)] text-lg font-semibold disabled:opacity-50"
          aria-pressed={userVote === -1}
          aria-label="Downvote"
          disabled={disabled || loading}
          onClick={() => vote(userVote === -1 ? 0 : -1)}
        >
          −
        </button>
      </div>
      {disabled && disabledReason ? (
        <p className="text-xs text-[var(--muted)]">{disabledReason}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
