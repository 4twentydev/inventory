import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { locations, stock, items } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locationId = parseInt(id);
  if (isNaN(locationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId));

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // All items stocked at this location
  const stockedItems = await db
    .select({
      stockId: stock.id,
      quantity: stock.quantity,
      itemDbId: items.id,
      itemId: items.itemId,
      description: items.description,
      category: items.category,
      subcategory: items.subcategory,
      color: items.color,
      finish: items.finish,
      gauge: items.gauge,
      unit: items.unit,
      profileImage: items.profileImage,
    })
    .from(stock)
    .leftJoin(items, eq(items.id, stock.itemId))
    .where(eq(stock.locationId, locationId));

  const totalStock = stockedItems.reduce((sum, s) => sum + s.quantity, 0);

  return NextResponse.json({
    id: location.id,
    name: location.name,
    description: location.description,
    createdAt: location.createdAt,
    totalStock,
    itemCount: stockedItems.length,
    items: stockedItems,
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
  const locationId = parseInt(id);
  if (isNaN(locationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { name, description } = body;

  const [updated] = await db
    .update(locations)
    .set({
      ...(name !== undefined && { name }),
      description: description ?? null,
    })
    .where(eq(locations.id, locationId))
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
  const locationId = parseInt(id);
  if (isNaN(locationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Check for existing stock
  const [stockCheck] = await db
    .select({ total: sql<number>`coalesce(sum(${stock.quantity}), 0)`.mapWith(Number) })
    .from(stock)
    .where(eq(stock.locationId, locationId));

  if (stockCheck && stockCheck.total > 0) {
    return NextResponse.json(
      { error: "Cannot delete location with existing stock" },
      { status: 409 },
    );
  }

  // Delete any zero-quantity stock rows first
  await db.delete(stock).where(eq(stock.locationId, locationId));
  await db.delete(locations).where(eq(locations.id, locationId));

  return NextResponse.json({ success: true });
}
