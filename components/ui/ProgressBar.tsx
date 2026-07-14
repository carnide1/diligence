type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
};

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const complete = pct >= 100 && max > 0;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{label}</span>
          <span className={complete ? "text-success" : undefined}>
            {Math.round(pct)}%
          </span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-bg-overlay"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-300",
            complete ? "bg-success" : "bg-accent",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
