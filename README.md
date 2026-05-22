# Allo Inventory Reservation System

A full-stack inventory reservation system built with Next.js, TypeScript, Prisma, PostgreSQL, and Redis.  
Users can reserve inventory for a limited duration, confirm purchases, or release reservations while ensuring concurrency-safe stock handling.

---

## Live Demo

https://allo-inventory-edb6x3uyt-krishan-v-naikmasurs-projects.vercel.app

---

## Features

- Product inventory listing
- Warehouse-wise stock availability
- Inventory reservation system
- 10-minute reservation expiry
- Reservation confirmation flow
- Reservation cancellation flow
- Concurrency-safe stock locking
- Prevention of overselling
- Near real-time stock updates
- Production deployment on Vercel

---

## Tech Stack

### Frontend
- Next.js 16
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js Route Handlers
- Prisma ORM
- PostgreSQL (Neon)

### Caching / Idempotency
- Redis (Upstash)

### Deployment
- Vercel

---

## Architecture

The system uses a reservation-based inventory model.

### Reservation Flow

1. User selects a product and warehouse
2. Backend creates a reservation
3. Stock is temporarily held for 10 minutes
4. User can:
   - Confirm purchase
   - Cancel reservation
   - Let reservation expire automatically

### Concurrency Handling

To prevent overselling during simultaneous reservations, the system uses:

- PostgreSQL transactions
- `SELECT FOR UPDATE` row locking
- Atomic stock updates

This guarantees that only available stock can be reserved even under concurrent requests.

---

## Database Models

### Product
Stores product details.

### Warehouse
Stores warehouse information.

### InventoryStock
Tracks stock availability and reserved units.

### Reservation
Tracks reservation lifecycle:
- PENDING
- CONFIRMED
- RELEASED

### IdempotencyRecord
Prevents duplicate reservation creation.

---

## API Routes

### Products

```http
GET /api/products
