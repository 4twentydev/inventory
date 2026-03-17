import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300",
  primary: "bg-blue-900/50 text-blue-300 border border-blue-700/50",
  success: "bg-green-900/50 text-green-300 border border-green-700/50",
  warning: "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50",
  danger: "bg-red-900/50 text-red-300 border border-red-700/50",
  outline: "border border-zinc-600 text-zinc-400",
};

export default function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
