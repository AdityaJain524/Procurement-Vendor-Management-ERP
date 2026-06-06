import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/utils";
import { Award, Truck, ShieldCheck, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Vendor Leaderboard — VendorBridge" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [{ data: vendors }, { data: quotes }, { data: pos }] = await Promise.all([
        supabase.from("vendors").select("*"),
        supabase.from("quotations").select("vendor_id,price,delivery_days,status"),
        supabase.from("purchase_orders").select("vendor_id,total_amount,status"),
      ]);
      return { vendors: vendors ?? [], quotes: quotes ?? [], pos: pos ?? [] };
    },
  });
  const vendors = (data?.vendors ?? []) as any[];
  const quotes = (data?.quotes ?? []) as any[];
  const pos = (data?.pos ?? []) as any[];
  const stats = vendors.map((v) => {
    const vq = quotes.filter((q) => q.vendor_id === v.id);
    const vpo = pos.filter((p) => p.vendor_id === v.id);
    const wins = vq.filter((q) => q.status === "awarded").length;
    const avgPrice = vq.length ? vq.reduce((s, q) => s + Number(q.price), 0) / vq.length : 0;
    const avgDays = vq.length ? vq.reduce((s, q) => s + Number(q.delivery_days), 0) / vq.length : 0;
    const totalSpend = vpo.reduce((s, p) => s + Number(p.total_amount), 0);
    return { ...v, wins, avgPrice, avgDays, totalSpend };
  });
  const bestPrice = [...stats].filter((s) => s.avgPrice > 0).sort((a, b) => a.avgPrice - b.avgPrice).slice(0, 5);
  const fastest = [...stats].filter((s) => s.avgDays > 0).sort((a, b) => a.avgDays - b.avgDays).slice(0, 5);
  const mostReliable = [...stats].sort((a, b) => Number(a.risk_score) - Number(b.risk_score)).slice(0, 5);
  const highestRated = [...stats].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Vendor Leaderboard</h1><p className="text-muted-foreground">Top performers across price, speed, reliability and quality.</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Board title="Best Price" icon={Award} items={bestPrice} metric={(v) => inr(v.avgPrice)} caption="avg quoted price" />
        <Board title="Fastest Delivery" icon={Truck} items={fastest} metric={(v) => `${v.avgDays.toFixed(1)} days`} caption="avg delivery" />
        <Board title="Most Reliable" icon={ShieldCheck} items={mostReliable} metric={(v) => `${Number(v.risk_score).toFixed(0)} risk`} caption="lowest risk score" />
        <Board title="Highest Rated" icon={Star} items={highestRated} metric={(v) => `★ ${Number(v.rating).toFixed(1)}`} caption="customer rating" />
      </div>
    </div>
  );
}

function Board({ title, icon: Icon, items, metric, caption }: { title: string; icon: any; items: any[]; metric: (v: any) => string; caption: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</h3><span className="text-xs text-muted-foreground">{caption}</span></div>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No data yet.</div>}
        {items.map((v, i) => (
          <div key={v.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/40">
            <div className="flex items-center gap-3">
              <div className={`h-7 w-7 grid place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-warning text-warning-foreground" : "bg-secondary"}`}>{i + 1}</div>
              <div><div className="text-sm font-medium">{v.company_name}</div><div className="text-xs text-muted-foreground capitalize">{v.category}</div></div>
            </div>
            <Badge variant="secondary">{metric(v)}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
