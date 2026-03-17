import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countSessions, countEntries, locations, users, stock } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await db
    .select({
      id: countSessions.id,
      name: countSessions.name,
      locationId: countSessions.locationId,
      locationName: locations.name,
      status: countSessions.status,
      createdAt: countSessions.createdAt,
      closedAt: countSessions.closedAt,
      createdBy: countSessions.createdBy,
      createdByName: users.name,
    })
    .from(countSessions)
    .leftJoin(locations, eq(locations.id, countSessions.locationId))
    .leftJoin(users, eq(users.id, countSessions.createdBy))
    .orderBy(sql`${countSessions.createdAt} desc`);

  // Get entry counts per session
  const entryCounts = await db
    .select({
      sessionId: countEntries.sessionId,
      count: sql<number>`count(*)::int`,
    })
    .from(countEntries)
    .groupBy(countEntries.sessionId);

  const entryCountMap = new Map(entryCounts.map((e) => [e.sessionId, e.count]));

  const result = sessions.map((s) => ({
    ...s,
    entryCount: entryCountMap.get(s.id) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, locationId } = body as { name?: string; locationId?: number };

  const [newSession] = await db
    .insert(countSessions)
    .values({
      name: name || null,
      locationId: locationId || null,
      status: "open",
      createdBy: session.id,
    })
    .returning();

  // If locationId provided, auto-populate entries from current stock
  if (locationId) {
    const stockRows = await db
      .select({
        itemId: stock.itemId,
        quantity: stock.quantity,
      })
      .from(stock)
      .where(eq(stock.locationId, locationId));

    if (stockRows.length > 0) {
      await db.insert(countEntries).values(
        stockRows.map((row) => ({
          sessionId: newSession.id,
          itemId: row.itemId,
          locationId: locationId,
          systemQty: row.quantity,
          countedQty: null,
        })),
      );
    }
  }

  return NextResponse.json(newSession, { status: 201 });
}
