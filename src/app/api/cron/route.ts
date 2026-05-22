import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel calls this every minute via vercel.json cron config
export async function GET(req: NextRequest) {
  // Protect with a shared secret in production
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
  });

  if (expired.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  // Release each one in a transaction
  let released = 0;
  for (const r of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryStock.updateMany({
        where: { productId: r.productId, warehouseId: r.warehouseId },
        data: { reserved: { decrement: r.quantity } },
      });
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: "RELEASED", releasedAt: now },
      });
    });
    released++;
  }

  console.log(`Cron: released ${released} expired reservations`);
  return NextResponse.json({ released });
}