import { NextResponse } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ITEM_COLUMNS } from "@/lib/xlsx-schema";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allItems = await db.select().from(items).orderBy(items.itemId);

  const rows = allItems.map((item) => ({
    item_id: item.itemId,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory ?? "",
    color: item.color ?? "",
    finish: item.finish ?? "",
    gauge: item.gauge ?? "",
    unit: item.unit,
    dimensions: item.dimensions ?? "",
    notes: item.notes ?? "",
    profile_image: item.profileImage ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ITEM_COLUMNS.map((c) => c.key),
  });

  // Set column widths
  ws["!cols"] = ITEM_COLUMNS.map((c) => ({ wch: c.width }));

  // Set header row with proper display names
  ITEM_COLUMNS.forEach((col, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (ws[cellRef]) {
      ws[cellRef].v = col.header;
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="items.xlsx"`,
    },
  });
}
