import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { movements, stock, items, locations, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type");
  const itemIdFilter = searchParams.get("itemId");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const fromLocAlias = alias(locations, "from_loc");
  const toLocAlias = alias(locations, "to_loc");

  const conditions = [];

  if (typeFilter) {
    conditions.push(
      eq(
        movements.type,
        typeFilter as "add" | "remove" | "transfer" | "adjustment",
      ),
    );
  }
  if (itemIdFilter) {
    conditions.push(eq(movements.itemId, parseInt(itemIdFilter)));
  }
  if (fromDate) {
    conditions.push(gte(movements.createdAt, new Date(fromDate)));
  }
  if (toDate) {
    const toEnd = new Date(toDate);
    toEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(movements.createdAt, toEnd));
  }

  const query = db
    .select({
      id: movements.id,
      type: movements.type,
      quantity: movements.quantity,
      notes: movements.notes,
      createdAt: movements.createdAt,
      itemDbId: items.id,
      itemId: items.itemId,
      itemDescription: items.description,
      fromLocation: fromLocAlias.name,
      toLocation: toLocAlias.name,
      userName: users.name,
    })
    .from(movements)
    .leftJoin(items, eq(items.id, movements.itemId))
    .leftJoin(fromLocAlias, eq(fromLocAlias.id, movements.fromLocationId))
    .leftJoin(toLocAlias, eq(toLocAlias.id, movements.toLocationId))
    .leftJoin(users, eq(users.id, movements.userId))
    .orderBy(desc(movements.createdAt))
    .limit(200);

  const rows =
    conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    type,
    itemId,
    fromLocationId,
    toLocationId,
    quantity,
    notes,
  }: {
    type: "add" | "remove" | "transfer";
    itemId: number;
    fromLocationId?: number;
    toLocationId?: number;
    quantity: number;
    notes?: string;
  } = body;

  if (!type || !itemId || !quantity || quantity <= 0) {
    return NextResponse.json(
      { error: "type, itemId, and quantity (>0) are required" },
      { status: 400 },
    );
  }

  if (type === "add") {
    if (!toLocationId) {
      return NextResponse.json(
        { error: "toLocationId is required for add" },
        { status: 400 },
      );
    }

    await db
      .insert(stock)
      .values({ itemId, locationId: toLocationId, quantity })
      .onConflictDoUpdate({
        target: [stock.itemId, stock.locationId],
        set: { quantity: sql`${stock.quantity} + ${quantity}` },
      });

    const [movement] = await db
      .insert(movements)
      .values({
        type: "add",
        itemId,
        toLocationId,
        quantity,
        notes: notes || null,
        userId: session.id,
      })
      .returning();

    return NextResponse.json(movement, { status: 201 });
  }

  if (type === "remove") {
    if (!toLocationId && !fromLocationId) {
      return NextResponse.json(
        { error: "toLocationId or fromLocationId is required for remove" },
        { status: 400 },
      );
    }

    const locationId = fromLocationId ?? toLocationId!;

    // Check sufficient stock
    const [currentStock] = await db
      .select({ quantity: stock.quantity })
      .from(stock)
      .where(
        and(eq(stock.itemId, itemId), eq(stock.locationId, locationId)),
      );

    if (!currentStock || currentStock.quantity < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock at location" },
        { status: 409 },
      );
    }

    await db
      .update(stock)
      .set({ quantity: sql`${stock.quantity} - ${quantity}` })
      .where(
        and(eq(stock.itemId, itemId), eq(stock.locationId, locationId)),
      );

    const [movement] = await db
      .insert(movements)
      .values({
        type: "remove",
        itemId,
        fromLocationId: locationId,
        quantity,
        notes: notes || null,
        userId: session.id,
      })
      .returning();

    return NextResponse.json(movement, { status: 201 });
  }

  if (type === "transfer") {
    if (!fromLocationId || !toLocationId) {
      return NextResponse.json(
        { error: "fromLocationId and toLocationId are required for transfer" },
        { status: 400 },
      );
    }

    // Check sufficient stock at source
    const [sourceStock] = await db
      .select({ quantity: stock.quantity })
      .from(stock)
      .where(
        and(
          eq(stock.itemId, itemId),
          eq(stock.locationId, fromLocationId),
        ),
      );

    if (!sourceStock || sourceStock.quantity < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock at source location" },
        { status: 409 },
      );
    }

    // Subtract from source
    await db
      .update(stock)
      .set({ quantity: sql`${stock.quantity} - ${quantity}` })
      .where(
        and(
          eq(stock.itemId, itemId),
          eq(stock.locationId, fromLocationId),
        ),
      );

    // Add to destination (upsert)
    await db
      .insert(stock)
      .values({ itemId, locationId: toLocationId, quantity })
      .onConflictDoUpdate({
        target: [stock.itemId, stock.locationId],
        set: { quantity: sql`${stock.quantity} + ${quantity}` },
      });

    const [movement] = await db
      .insert(movements)
      .values({
        type: "transfer",
        itemId,
        fromLocationId,
        toLocationId,
        quantity,
        notes: notes || null,
        userId: session.id,
      })
      .returning();

    return NextResponse.json(movement, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid movement type" }, { status: 400 });
}
