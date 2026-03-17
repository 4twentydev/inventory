import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Card({ className, children }: CardProps) {
  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg", className)}>
      {children}
    </div>
  );
}
