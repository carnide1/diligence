import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-bg hover:brightness-110 disabled:opacity-50",
  secondary:
    "bg-bg-overlay text-foreground border border-border hover:border-border-strong disabled:opacity-50",
  ghost:
    "bg-transparent text-muted hover:bg-bg-overlay hover:text-foreground disabled:opacity-50",
  danger:
    "bg-danger-soft text-danger border border-danger/30 hover:brightness-110 disabled:opacity-50",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-[filter,background-color,border-color,color] duration-150 cursor-pointer disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
