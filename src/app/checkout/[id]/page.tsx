"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "sonner";

type Reservation = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  quantity: number;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  product: { name: string; priceInPaise: number };
  warehouse: { name: string; city: string };
};

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return { secondsLeft, display: `${mins}:${secs.toString().padStart(2, "0")}` };
}

export default function CheckoutPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  
  const { secondsLeft, display } = useCountdown(
    reservation?.status === "PENDING" ? reservation.expiresAt : null
  );

  const fetchReservation = useCallback(async () => {
    const res = await fetch(`/api/reservations/${params.id}`);
    if (res.ok) setReservation(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  // Auto-refresh state when timer hits zero
  useEffect(() => {
    if (secondsLeft === 0 && reservation?.status === "PENDING") {
      setTimeout(fetchReservation, 2000);
    }
  }, [secondsLeft, reservation?.status, fetchReservation]);

  async function confirm() {
    setActing(true);
    const res = await fetch(`/api/reservations/${params.id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (res.status === 410) {
      toast.error("Reservation expired. Your hold time ran out.");
      setReservation((r) => r ? { ...r, status: "RELEASED" } : r);
    } else if (!res.ok) {
      toast.error(data.error);
    } else {
      setReservation(data);
      toast.success("Purchase confirmed! Your order has been placed.");
    }
    setActing(false);
  }

  async function cancel() {
    setActing(true);
    const res = await fetch(`/api/reservations/${params.id}/release`, { method: "POST" });
    if (res.ok) {
      setReservation(await res.json());
      toast.success("Reservation cancelled. Stock released.");
    }
    setActing(false);
  }

  if (loading) return <div className="flex justify-center p-20 text-muted-foreground">Loading...</div>;
  if (!reservation) return <div className="flex justify-center p-20 text-destructive">Reservation not found.</div>;

  const isPending = reservation.status === "PENDING";
  const isExpired = isPending && secondsLeft === 0;

  return (
    <main className="max-w-lg mx-auto p-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/")}>← Back to products</Button>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checkout</CardTitle>
            <Badge variant={
              reservation.status === "CONFIRMED" ? "default" :
              reservation.status === "RELEASED" ? "destructive" : "secondary"
            }>
              {reservation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="font-medium">{reservation.product.name}</p>
            <p className="text-sm text-muted-foreground">{reservation.warehouse.name}, {reservation.warehouse.city}</p>
            <p className="text-sm text-muted-foreground">Qty: {reservation.quantity}</p>
            <p className="text-lg font-semibold">₹{(reservation.product.priceInPaise / 100).toLocaleString("en-IN")}</p>
          </div>

          {isPending && (
            <div className={`rounded-lg p-4 text-center ${isExpired ? "bg-destructive/10" : secondsLeft < 60 ? "bg-orange-50 dark:bg-orange-950/30" : "bg-muted"}`}>
              <p className="text-xs text-muted-foreground mb-1">
                {isExpired ? "Hold expired" : "Hold expires in"}
              </p>
              <p className={`text-3xl font-mono font-bold ${isExpired ? "text-destructive" : secondsLeft < 60 ? "text-orange-500" : ""}`}>
                {isExpired ? "Expired" : display}
              </p>
            </div>
          )}

          {reservation.status === "CONFIRMED" && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <p className="text-green-700 dark:text-green-400 font-medium">Purchase confirmed!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Confirmed at {new Date(reservation.confirmedAt!).toLocaleTimeString()}
              </p>
            </div>
          )}

          {reservation.status === "RELEASED" && (
            <div className="rounded-lg bg-destructive/10 p-4 text-center">
              <p className="text-destructive font-medium">Reservation released</p>
              <Button className="mt-3" onClick={() => router.push("/")} variant="outline" size="sm">Browse products</Button>
            </div>
          )}

          {isPending && !isExpired && (
            <div className="flex gap-3">
              <Button className="flex-1" onClick={confirm} disabled={acting}>
                {acting ? "Processing..." : "Confirm purchase"}
              </Button>
              <Button variant="outline" onClick={cancel} disabled={acting}>Cancel</Button>
            </div>
          )}

          {isPending && isExpired && (
            <Button className="w-full" variant="outline" onClick={() => router.push("/")}>
              Start over
            </Button>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </main>
  );
}