import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "danger" | "outline" | "secondary";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  ghost: "hover:bg-zinc-800 text-zinc-400 hover:text-white",
  danger: "bg-red-700 hover:bg-red-600 text-white",
  outline: "border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white",
  secondary: "bg-zinc-800 hover:bg-zinc-700 text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-10 px-4 text-sm gap-2",
  icon: "h-9 w-9",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded font-medium transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "[&_svg]:shrink-0 [&_svg]:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export default Button;
