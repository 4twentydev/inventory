import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, stock, locations, movements, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const itemId = parseInt(id);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Stock by location
  const stockRows = await db
    .select({
      locationId: locations.id,
      locationName: locations.name,
      quantity: stock.quantity,
    })
    .from(stock)
    .leftJoin(locations, eq(locations.id, stock.locationId))
    .where(eq(stock.itemId, itemId));

  const stockByLocation = stockRows
    .filter((r) => r.locationId !== null)
    .map((r) => ({
      locationId: r.locationId!,
      locationName: r.locationName!,
      quantity: r.quantity,
    }));

  const totalStock = stockByLocation.reduce((sum, s) => sum + s.quantity, 0);

  // Last 10 movements with aliased location joins
  const fromLocAlias = alias(locations, "from_loc");
  const toLocAlias = alias(locations, "to_loc");

  const movementRows = await db
    .select({
      id: movements.id,
      type: movements.type,
      quantity: movements.quantity,
      notes: movements.notes,
      createdAt: movements.createdAt,
      fromLocation: fromLocAlias.name,
      toLocation: toLocAlias.name,
      userName: users.name,
    })
    .from(movements)
    .leftJoin(fromLocAlias, eq(fromLocAlias.id, movements.fromLocationId))
    .leftJoin(toLocAlias, eq(toLocAlias.id, movements.toLocationId))
    .leftJoin(users, eq(users.id, movements.userId))
    .where(eq(movements.itemId, itemId))
    .orderBy(desc(movements.createdAt))
    .limit(10);

  const movementList = movementRows.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: m.quantity,
    notes: m.notes ?? undefined,
    createdAt: m.createdAt,
    fromLocation: m.fromLocation ?? undefined,
    toLocation: m.toLocation ?? undefined,
    userName: m.userName ?? undefined,
  }));

  return NextResponse.json({
    id: item.id,
    itemId: item.itemId,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory ?? undefined,
    color: item.color ?? undefined,
    finish: item.finish ?? undefined,
    gauge: item.gauge ?? undefined,
    unit: item.unit,
    notes: item.notes ?? undefined,
    profileImage: item.profileImage ?? undefined,
    dimensions: item.dimensions ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    totalStock,
    stockByLocation,
    movements: movementList,
  });
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
  const itemId = parseInt(id);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const {
    itemId: newItemId,
    description,
    category,
    subcategory,
    color,
    finish,
    gauge,
    unit,
    notes,
    profileImage,
    dimensions,
  } = body;

  const [updated] = await db
    .update(items)
    .set({
      ...(newItemId !== undefined && { itemId: newItemId }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      subcategory: subcategory ?? null,
      color: color ?? null,
      finish: finish ?? null,
      gauge: gauge ?? null,
      ...(unit !== undefined && { unit }),
      notes: notes ?? null,
      profileImage: profileImage ?? null,
      dimensions: dimensions ?? null,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const itemId = parseInt(id);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db.delete(items).where(eq(items.id, itemId));

  return NextResponse.json({ success: true });
}
