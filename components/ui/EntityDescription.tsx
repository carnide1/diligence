export function EntityDescription({ text }: { text: string }) {
  return (
    <>
      <p className="mb-1.5 px-3 text-xs font-medium text-muted">Description</p>
      <div className="rounded-[var(--radius-sm)] bg-bg-overlay/80 px-3 py-2">
        <p className="break-words text-xs leading-relaxed text-muted">{text}</p>
      </div>
    </>
  );
}
