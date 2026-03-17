import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, stock, locations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemRows = await db.select().from(items);

  if (itemRows.length === 0) {
    return NextResponse.json([]);
  }

  const stockRows = await db
    .select({
      itemId: stock.itemId,
      locationId: locations.id,
      locationName: locations.name,
      quantity: stock.quantity,
    })
    .from(stock)
    .leftJoin(locations, eq(locations.id, stock.locationId));

  const stockByItem = new Map<
    number,
    Array<{ locationId: number; locationName: string; quantity: number }>
  >();

  for (const row of stockRows) {
    if (!stockByItem.has(row.itemId)) {
      stockByItem.set(row.itemId, []);
    }
    if (row.locationId !== null && row.locationName !== null) {
      stockByItem.get(row.itemId)!.push({
        locationId: row.locationId,
        locationName: row.locationName,
        quantity: row.quantity,
      });
    }
  }

  const results = itemRows.map((item) => {
    const locationStocks = stockByItem.get(item.id) ?? [];
    const totalStock = locationStocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
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
      totalStock,
      stockByLocation: locationStocks,
    };
  });

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    itemId,
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

  if (!itemId || !description || !category) {
    return NextResponse.json(
      { error: "itemId, description, and category are required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(items)
    .values({
      itemId,
      description,
      category,
      subcategory: subcategory || null,
      color: color || null,
      finish: finish || null,
      gauge: gauge || null,
      unit: unit ?? "ea",
      notes: notes || null,
      profileImage: profileImage || null,
      dimensions: dimensions || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
