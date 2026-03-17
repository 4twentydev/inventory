import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countSessions, countEntries } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sessionId = parseInt(id, 10);
  if (isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [countSession] = await db
    .select()
    .from(countSessions)
    .where(eq(countSessions.id, sessionId));

  if (!countSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (countSession.status !== "open") {
    return NextResponse.json(
      { error: "Session is closed" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const { itemId, locationId, systemQty } = body as {
    itemId: number;
    locationId?: number | null;
    systemQty?: number;
  };

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const [entry] = await db
    .insert(countEntries)
    .values({
      sessionId,
      itemId,
      locationId: locationId ?? null,
      systemQty: systemQty ?? 0,
      countedQty: null,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
