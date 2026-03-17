import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import Nav from "@/components/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shop Inventory",
  description: "Manufacturing shop inventory management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className={inter.className}>
      <body className="bg-zinc-950 text-white antialiased">
        {session ? (
          <div className="flex h-screen bg-zinc-950">
            <Nav session={session} />
            <main className="flex-1 overflow-auto pl-56">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
