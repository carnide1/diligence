type StubPageProps = {
  title: string;
  description: string;
};

export function StubPage({ title, description }: StubPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        {title}
      </h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted">
        {description}
      </p>
      <div className="mt-2 rounded-[var(--radius)] border border-border bg-bg-elevated/60 px-4 py-6 text-sm text-faint">
        Stub surface — wired up in a later phase.
      </div>
    </div>
  );
}
