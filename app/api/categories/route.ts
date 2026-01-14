import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const prismaAny = prisma as any;

export async function GET() {
  try {
    const categories = await prismaAny.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

