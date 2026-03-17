import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, hashPin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(allUsers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, pin, role } = body as {
    name: string;
    pin: string;
    role: string;
  };

  if (!name || !pin || !role) {
    return NextResponse.json(
      { error: "name, pin, and role are required" },
      { status: 400 },
    );
  }

  const hashedPin = await hashPin(pin);

  const [created] = await db
    .insert(users)
    .values({
      name,
      pin: hashedPin,
      role: role as "admin" | "user",
    })
    .returning({
      id: users.id,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

  return NextResponse.json(created, { status: 201 });
}
