import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminClient from "./client";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/search");
  return <AdminClient />;
}
