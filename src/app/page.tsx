"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "sonner";

type Stock = {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  available: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  priceInPaise: number;
  stocks: Stock[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const router = useRouter();
  

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  async function reserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error(data.error);
        return;
      }
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Reservation created successfully");

      router.push(`/checkout/${data.id}`);
    } finally {
      setReserving(null);
    }
  }

  if (loading) return <div className="flex justify-center p-20 text-muted-foreground">Loading products...</div>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Products</h1>
      <p className="text-muted-foreground mb-8 text-sm">Reserve a product to hold it for 10 minutes while you complete payment.</p>
      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">SKU: {product.sku}</p>
                </div>
                <span className="text-lg font-semibold">
                  ₹{(product.priceInPaise / 100).toLocaleString("en-IN")}
                </span>
              </div>
              {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {product.stocks.map((stock) => (
                  <div key={stock.warehouseId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <span className="text-sm font-medium">{stock.warehouseName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{stock.warehouseCity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={stock.available > 0 ? "secondary" : "destructive"}>
                        {stock.available > 0 ? `${stock.available} available` : "Out of stock"}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={stock.available === 0 || reserving === `${product.id}-${stock.warehouseId}`}
                        onClick={() => reserve(product.id, stock.warehouseId)}
                      >
                        {reserving === `${product.id}-${stock.warehouseId}` ? "Reserving..." : "Reserve"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Toaster />
    </main>
  );
}