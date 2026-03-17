import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { type ItemRow } from "@/lib/xlsx-schema";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const item_id = String(row["item_id"] ?? row["Item ID"] ?? "").trim();
    const description = String(
      row["description"] ?? row["Description"] ?? "",
    ).trim();
    const category = String(row["category"] ?? row["Category"] ?? "").trim();
    const unit = String(row["unit"] ?? row["Unit"] ?? "ea").trim();

    if (!item_id) {
      errors.push(`Row ${rowNum}: missing item_id`);
      continue;
    }
    if (!description) {
      errors.push(`Row ${rowNum}: missing description`);
      continue;
    }
    if (!category) {
      errors.push(`Row ${rowNum}: missing category`);
      continue;
    }

    const subcategory =
      String(row["subcategory"] ?? row["Subcategory"] ?? "").trim() ||
      null;
    const color =
      String(row["color"] ?? row["Color"] ?? "").trim() || null;
    const finish =
      String(row["finish"] ?? row["Finish"] ?? "").trim() || null;
    const gauge =
      String(row["gauge"] ?? row["Gauge"] ?? "").trim() || null;
    const notes =
      String(row["notes"] ?? row["Notes"] ?? "").trim() || null;
    const profileImage =
      String(
        row["profile_image"] ?? row["Profile Image"] ?? "",
      ).trim() || null;
    const dimensions =
      String(row["dimensions"] ?? row["Dimensions"] ?? "").trim() || null;

    try {
      // Check if exists to track created vs updated
      const existing = await db.query.items.findFirst({
        where: (items, { eq }) => eq(items.itemId, item_id),
      });

      await db
        .insert(items)
        .values({
          itemId: item_id,
          description,
          category,
          subcategory,
          color,
          finish,
          gauge,
          unit: unit || "ea",
          notes,
          profileImage,
          dimensions,
        })
        .onConflictDoUpdate({
          target: [items.itemId],
          set: {
            description,
            category,
            subcategory,
            color,
            finish,
            gauge,
            unit: unit || "ea",
            notes,
            profileImage,
            dimensions,
            updatedAt: new Date(),
          },
        });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${item_id}): ${String(err)}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
