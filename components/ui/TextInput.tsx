import { forwardRef, type InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, id, className = "", ...props }, ref) {
    const inputId = id ?? props.name;

    return (
      <label className="flex flex-col gap-1.5 text-sm">
        {label ? (
          <span className="font-medium text-muted">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={[
            "h-10 rounded-[var(--radius-sm)] border bg-bg-elevated px-3 text-foreground placeholder:text-faint",
            error ? "border-danger" : "border-border focus:border-accent",
            className,
          ].join(" ")}
          {...props}
        />
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </label>
    );
  },
);
