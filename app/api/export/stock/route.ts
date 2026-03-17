import { NextResponse } from "next/server";
import { db } from "@/db";
import { items, stock, locations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { STOCK_COLUMNS } from "@/lib/xlsx-schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      item_id: items.itemId,
      description: items.description,
      category: items.category,
      location: locations.name,
      quantity: stock.quantity,
      unit: items.unit,
    })
    .from(stock)
    .innerJoin(items, eq(items.id, stock.itemId))
    .innerJoin(locations, eq(locations.id, stock.locationId))
    .orderBy(items.itemId, locations.name);

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: STOCK_COLUMNS.map((c) => c.key),
  });

  // Set column widths
  ws["!cols"] = STOCK_COLUMNS.map((c) => ({ wch: c.width }));

  // Set header row with proper display names
  STOCK_COLUMNS.forEach((col, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (ws[cellRef]) {
      ws[cellRef].v = col.header;
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stock.xlsx"`,
    },
  });
}
