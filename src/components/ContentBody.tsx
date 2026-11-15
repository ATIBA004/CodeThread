export function ContentBody({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap break-words text-[var(--foreground)]">
      {text}
    </div>
  );
}
