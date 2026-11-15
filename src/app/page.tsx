import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
        Channel Q&amp;A
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        A channel-based forum for questions and answers. Create channels, post
        topics, reply in nested threads, vote on helpful content, attach
        screenshots, and search across the community. Sign in to participate;
        browsing is open to everyone after you leave this page.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-md border-2 border-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent)] no-underline focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-md border-2 border-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent)] no-underline focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
