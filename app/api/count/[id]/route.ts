import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countSessions, countEntries, items, locations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
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
    .select({
      id: countSessions.id,
      name: countSessions.name,
      locationId: countSessions.locationId,
      locationName: locations.name,
      status: countSessions.status,
      createdAt: countSessions.createdAt,
      closedAt: countSessions.closedAt,
      createdBy: countSessions.createdBy,
    })
    .from(countSessions)
    .leftJoin(locations, eq(locations.id, countSessions.locationId))
    .where(eq(countSessions.id, sessionId));

  if (!countSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entryRows = await db
    .select({
      id: countEntries.id,
      sessionId: countEntries.sessionId,
      itemId: countEntries.itemId,
      locationId: countEntries.locationId,
      systemQty: countEntries.systemQty,
      countedQty: countEntries.countedQty,
      notes: countEntries.notes,
      itemDbId: items.id,
      itemItemId: items.itemId,
      itemDescription: items.description,
      itemCategory: items.category,
      itemUnit: items.unit,
      locationName: locations.name,
    })
    .from(countEntries)
    .leftJoin(items, eq(items.id, countEntries.itemId))
    .leftJoin(locations, eq(locations.id, countEntries.locationId))
    .where(eq(countEntries.sessionId, sessionId));

  const entries = entryRows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    itemId: row.itemId,
    locationId: row.locationId,
    systemQty: row.systemQty,
    countedQty: row.countedQty,
    notes: row.notes,
    item: {
      itemId: row.itemItemId ?? "",
      description: row.itemDescription ?? "",
      category: row.itemCategory ?? "",
      unit: row.itemUnit ?? "ea",
    },
    locationName: row.locationName ?? undefined,
    variance:
      row.countedQty !== null ? row.countedQty - row.systemQty : null,
  }));

  return NextResponse.json({ session: countSession, entries });
}

export async function PUT(
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

  const body = await req.json();
  const { entryId, countedQty } = body as {
    entryId: number;
    countedQty: number;
  };

  if (entryId === undefined || countedQty === undefined) {
    return NextResponse.json(
      { error: "entryId and countedQty are required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(countEntries)
    .set({ countedQty })
    .where(
      and(eq(countEntries.id, entryId), eq(countEntries.sessionId, sessionId)),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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

  const [existing] = await db
    .select()
    .from(countSessions)
    .where(eq(countSessions.id, sessionId));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "open") {
    return NextResponse.json(
      { error: "Session is not open" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(countSessions)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(countSessions.id, sessionId))
    .returning();

  return NextResponse.json(updated);
}
