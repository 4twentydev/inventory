import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "bg-zinc-900 border border-zinc-700 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500",
          "text-white placeholder:text-zinc-500 rounded px-3 py-2 w-full outline-none",
          "transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;
