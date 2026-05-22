import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Compute available = total - reserved per warehouse
  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    priceInPaise: p.priceInPaise,
    stocks: p.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      warehouseCity: s.warehouse.city,
      totalUnits: s.totalUnits,
      reserved: s.reserved,
      available: s.totalUnits - s.reserved,  // key computed field
    })),
  }));

  return NextResponse.json(result);
}