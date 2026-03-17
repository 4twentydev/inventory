import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = React.ComponentProps<"select">;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2",
          "focus:border-zinc-500 outline-none w-full transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

export { Select };
export default Select;
