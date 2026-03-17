"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Package,
  MapPin,
  ArrowLeftRight,
  ClipboardList,
  Upload,
  Settings,
  LogOut,
  Box,
} from "lucide-react";
import type { Session } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavProps = {
  session: Session;
};

const navLinks = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/items", label: "Items", icon: Package },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/movements", label: "Movements", icon: ArrowLeftRight },
  { href: "/count", label: "Count", icon: ClipboardList },
  { href: "/import", label: "Import", icon: Upload },
];

export default function Nav({ session }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-40">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-7 h-7 bg-zinc-800 border border-zinc-700 rounded">
          <Box className="w-4 h-4 text-zinc-300" />
        </div>
        <span className="font-bold text-lg tracking-widest text-white">
          SHOP INV
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
        {session.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="mb-2 px-2">
          <p className="text-sm font-medium text-white truncate">{session.name}</p>
          <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
            {session.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
