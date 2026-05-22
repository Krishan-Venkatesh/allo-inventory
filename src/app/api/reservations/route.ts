import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { CreateReservationSchema } from "@/lib/schemas";

const RESERVATION_TTL_MINUTES = 10;

export async function POST(req: NextRequest) {
  // --- Idempotency (bonus) ---
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    const cached = await redis.get<{ status: number; body: string }>(
      `idempotency:${idempotencyKey}`
    );
    if (cached) {
      return new NextResponse(cached.body, {
        status: cached.status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // --- Parse + validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateReservationSchema.safeParse(body);

if (!parsed.success) {
  console.log(parsed.error.flatten());

  return NextResponse.json(
    { error: "Validation failed", details: parsed.error.flatten() },
    { status: 400 }
  );
}

  const { productId, warehouseId, quantity } = parsed.data;

  // --- Core reservation logic inside a Prisma transaction ---
  // SELECT FOR UPDATE locks the inventory row, so two concurrent
  // requests for the same product+warehouse are serialised by Postgres.
  // Only one transaction can hold the lock at a time — the other waits,
  // then sees the updated reserved count and returns 409 if stock is gone.
  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Lock the inventory row (row-level exclusive lock)
      const stockRows = await tx.$queryRaw<
        { id: string; totalUnits: number; reserved: number }[]
      >`
        SELECT id, "totalUnits", reserved
        FROM "InventoryStock"
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (stockRows.length === 0) {
        throw new Error("STOCK_NOT_FOUND");
      }

      const stock = stockRows[0];
      const available = stock.totalUnits - stock.reserved;

      if (available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // 2. Increment reserved count atomically
      await tx.$executeRaw`
        UPDATE "InventoryStock"
        SET reserved = reserved + ${quantity}
        WHERE id = ${stock.id}
      `;

      // 3. Create the reservation record
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );
      const newReservation = await tx.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt },
        include: { product: true, warehouse: true },
      });

      return newReservation;
    });

    const responseBody = JSON.stringify({
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    });

    // Cache for idempotency
    if (idempotencyKey) {
      await redis.set(
        `idempotency:${idempotencyKey}`,
        { status: 201, body: responseBody },
        { ex: 86400 }  // keep for 24h
      );
    }

    return new NextResponse(responseBody, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Not enough stock available" },
          { status: 409 }
        );
      }
      if (err.message === "STOCK_NOT_FOUND") {
        return NextResponse.json(
          { error: "Product not found in this warehouse" },
          { status: 404 }
        );
      }
    }
    console.error("Reservation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}