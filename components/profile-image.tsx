import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileImageProps = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: 40,
  md: 80,
  lg: 160,
} as const;

export default function ProfileImage({ src, alt, size = "md" }: ProfileImageProps) {
  const px = sizeMap[size];

  if (src) {
    return (
      <Image
        src={`/ext-profiles/${src}`}
        alt={alt}
        width={px}
        height={px}
        className={cn("rounded object-cover shrink-0")}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded bg-zinc-800 border border-zinc-700 shrink-0"
      )}
      style={{ width: px, height: px }}
    >
      <Package
        className="text-zinc-500"
        style={{ width: px * 0.45, height: px * 0.45 }}
      />
    </div>
  );
}
