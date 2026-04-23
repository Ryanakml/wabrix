import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary";
  }
>;

export function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClassName =
    variant === "secondary"
      ? "border border-stone-300 bg-stone-100 text-stone-950 hover:bg-stone-200"
      : "bg-stone-950 text-stone-50 hover:bg-stone-800";

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${variantClassName} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
