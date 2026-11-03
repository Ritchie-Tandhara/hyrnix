import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: { manager: true },
    orderBy: [{ department: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ employees });
}
