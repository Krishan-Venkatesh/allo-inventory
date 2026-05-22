// src/lib/schemas.ts
import { z } from "zod";

export const CreateReservationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive().max(100),
});

export const ReservationIdSchema = z.object({
  id: z.string().cuid(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;