import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CountClient from "./client";

export default async function CountSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  return <CountClient id={id} />;
}
