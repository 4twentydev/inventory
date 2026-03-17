import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPin, setSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, pin } = body as { userId: number; pin: string };

  if (!userId || !pin) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const valid = await verifyPin(pin, user.pin);
  if (!valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await setSession({ id: user.id, name: user.name, role: user.role });
  return NextResponse.json({ ok: true });
}
