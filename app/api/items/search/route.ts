import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, stock, locations } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // Query items with optional search
  const itemRows = q
    ? await db
        .select()
        .from(items)
        .where(
          or(
            ilike(items.itemId, `%${q}%`),
            ilike(items.description, `%${q}%`),
            ilike(items.category, `%${q}%`),
            ilike(items.subcategory, `%${q}%`),
            ilike(items.color, `%${q}%`),
            ilike(items.finish, `%${q}%`),
            ilike(items.gauge, `%${q}%`),
            ilike(items.notes, `%${q}%`),
          ),
        )
    : await db.select().from(items);

  if (itemRows.length === 0) {
    return NextResponse.json([]);
  }

  // Get all stock + location info in one query
  const stockRows = await db
    .select({
      itemId: stock.itemId,
      locationId: locations.id,
      locationName: locations.name,
      quantity: stock.quantity,
    })
    .from(stock)
    .leftJoin(locations, eq(locations.id, stock.locationId));

  // Group stock by itemId
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
