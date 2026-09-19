import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "subtle";
  size?: "sm" | "md";
  iconOnly?: boolean;
  icon?: ReactNode;
}

/** Design-system button. `primary` is reserved for the single main action in a view. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", iconOnly = false, icon, className = "", children, ...rest },
  ref
) {
  const cls = ["btn", `btn-${variant}`, `btn-${size}`, iconOnly ? "btn-icon" : "", className].filter(Boolean).join(" ");
  return (
    <button ref={ref} type="button" className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
});
