import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new Error("NOT_FOUND");
      if (reservation.status !== "PENDING") throw new Error(`WRONG_STATUS:${reservation.status}`);

      await tx.inventoryStock.updateMany({
        where: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
        data: { reserved: { decrement: reservation.quantity } },
      });

      return tx.reservation.update({
        where: { id },
        data: {
         status: "RELEASED",
            releasedAt: new Date(),
        },
        include: {
            product: true,
            warehouse: true,
        },
    });
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.message.startsWith("WRONG_STATUS"))
        return NextResponse.json({ error: `Cannot release: reservation is ${err.message.split(":")[1].toLowerCase()}` }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}