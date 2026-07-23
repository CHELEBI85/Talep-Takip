import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-field font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-11";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  soft: "bg-primary-soft text-primary border border-primary-soft-border hover:bg-[#e4ebfa]",
  ghost: "text-muted-2 hover:text-ink-2",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } px-[18px] py-[13px] text-sm ${className}`}
      {...props}
    />
  );
}
