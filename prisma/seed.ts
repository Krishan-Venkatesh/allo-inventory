import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({});

async function main() {
  console.log("Seeding database...");

  // Warehouses
  const mumbai = await prisma.warehouse.upsert({
    where: { id: "wh-mumbai" },
    update: {},
    create: { id: "wh-mumbai", name: "Mumbai Central", city: "Mumbai" },
  });
  const delhi = await prisma.warehouse.upsert({
    where: { id: "wh-delhi" },
    update: {},
    create: { id: "wh-delhi", name: "Delhi North", city: "Delhi" },
  });
  const bengaluru = await prisma.warehouse.upsert({
    where: { id: "wh-blr" },
    update: {},
    create: { id: "wh-blr", name: "Bengaluru Hub", city: "Bengaluru" },
  });

  // Products + stock
  const products = [
    { id: "prod-001", name: "Wireless Headphones", sku: "WH-PRO-100", description: "Premium noise-cancelling headphones", priceInPaise: 899900 },
    { id: "prod-002", name: "Mechanical Keyboard", sku: "KB-MECH-200", description: "TKL layout, tactile switches", priceInPaise: 549900 },
    { id: "prod-003", name: "USB-C Hub 7-in-1", sku: "HUB-7C-300", description: "4K HDMI, 100W PD, USB 3.0", priceInPaise: 249900 },
    { id: "prod-004", name: "Ergonomic Mouse", sku: "MS-ERGO-400", description: "Vertical grip, 6 buttons", priceInPaise: 349900 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
    // Add stock in each warehouse
    for (const wh of [mumbai, delhi, bengaluru]) {
      await prisma.inventoryStock.upsert({
        where: { productId_warehouseId: { productId: p.id, warehouseId: wh.id } },
        update: {},
        create: {
          productId: p.id,
          warehouseId: wh.id,
          totalUnits: Math.floor(Math.random() * 20) + 5,  // 5-25 units
          reserved: 0,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());