import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { locations, stock } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: locations.id,
      name: locations.name,
      description: locations.description,
      createdAt: locations.createdAt,
      itemCount: sql<number>`count(distinct ${stock.itemId})`.mapWith(Number),
      totalStock:
        sql<number>`coalesce(sum(${stock.quantity}), 0)`.mapWith(Number),
    })
    .from(locations)
    .leftJoin(stock, eq(stock.locationId, locations.id))
    .groupBy(locations.id);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(locations)
    .values({ name, description: description || null })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
