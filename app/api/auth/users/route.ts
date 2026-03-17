import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(users.name);
  return NextResponse.json(result);
}
