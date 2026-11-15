"use client";

import { useEffect, useState } from "react";
import { AppNav, type Me } from "./AppNav";

function skipToMainContent(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const main = document.getElementById("main-content");
  if (!main) return;
  main.scrollIntoView({ behavior: "smooth", block: "start" });
  main.focus({ preventScroll: true });
}

export function PageShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await res.json()) as {
        user: { id: number; displayName: string; role: "user" | "admin" } | null;
      };
      if (cancelled) return;
      setMe(
        data.user
          ? {
              id: data.user.id,
              displayName: data.user.displayName,
              role: data.user.role,
            }
          : null,
      );
      setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showSkipLink = authReady && me === null;

  return (
    <>
      {showSkipLink ? (
        <a
          href="#main-content"
          className="skip-link"
          onClick={skipToMainContent}
        >
          Skip to main content
        </a>
      ) : null}
      <AppNav me={me} />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        {children}
      </main>
    </>
  );
}
