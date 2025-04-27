import React from "react";
import { cn } from "../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  gradient?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  variant?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      gradient,
      size = "md",
      fullWidth,
      variant,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    let variantClasses = "";
    if (variant === "default") {
      variantClasses = "bg-primary text-primary-foreground hover:bg-primary/90";
    } else if (variant === "outline") {
      variantClasses =
        "border border-input hover:bg-accent hover:text-accent-foreground";
    } else if (variant === "ghost") {
      variantClasses = "hover:bg-accent hover:text-accent-foreground";
    }

    const sizeClasses =
      size === "sm"
        ? "h-9 px-3 text-sm"
        : size === "lg"
        ? "h-11 px-8 text-base"
        : "h-10 px-4 py-2 text-sm";

    const gradientClasses = gradient
      ? "bg-gradient-to-r from-blue-500 to-indigo-600"
      : "";
    const widthClasses = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses,
          sizeClasses,
          gradientClasses,
          widthClasses,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
