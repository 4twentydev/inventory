import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countSessions, countEntries, stock, movements } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
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
      { error: "Session is already closed" },
      { status: 400 },
    );
  }

  const entries = await db
    .select()
    .from(countEntries)
    .where(eq(countEntries.sessionId, sessionId));

  let adjusted = 0;

  for (const entry of entries) {
    if (entry.countedQty === null) continue;
    const variance = entry.countedQty - entry.systemQty;
    if (variance === 0) continue;

    const locationId = entry.locationId;
    if (!locationId) continue;

    if (variance > 0) {
      // Upsert stock adding variance
      await db
        .insert(stock)
        .values({
          itemId: entry.itemId,
          locationId,
          quantity: variance,
        })
        .onConflictDoUpdate({
          target: [stock.itemId, stock.locationId],
          set: {
            quantity: sql`${stock.quantity} + ${variance}`,
          },
        });
    } else {
      // Reduce stock, ensure >= 0
      await db
        .insert(stock)
        .values({
          itemId: entry.itemId,
          locationId,
          quantity: 0,
        })
        .onConflictDoUpdate({
          target: [stock.itemId, stock.locationId],
          set: {
            quantity: sql`GREATEST(0, ${stock.quantity} + ${variance})`,
          },
        });
    }

    // Log adjustment movement
    await db.insert(movements).values({
      type: "adjustment",
      itemId: entry.itemId,
      toLocationId: locationId,
      quantity: Math.abs(variance),
      notes: `Count adjustment: session ${sessionId}`,
      userId: session.id,
    });

    adjusted++;
  }

  const [closedSession] = await db
    .update(countSessions)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(countSessions.id, sessionId))
    .returning();

  return NextResponse.json({ adjusted, session: closedSession });
}
