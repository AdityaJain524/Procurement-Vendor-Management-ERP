import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inr, fmtDate } from "@/lib/utils";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — VendorBridge" }] }),
  component: Analytics,
});

function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [{ data: pos }, { data: rfqs }, { data: app }, { data: vendors }] = await Promise.all([
        supabase.from("purchase_orders").select("total_amount,vendor_id,created_at,status"),
        supabase.from("rfqs").select("status,created_at"),
        supabase.from("approvals").select("decision,decided_at,created_at"),
        supabase.from("vendors").select("company_name,rating,risk_score"),
      ]);
      return { pos: pos ?? [], rfqs: rfqs ?? [], app: app ?? [], vendors: vendors ?? [] };
    },
  });
  const pos = (data?.pos ?? []) as any[];
  const rfqs = (data?.rfqs ?? []) as any[];
  const app = (data?.app ?? []) as any[];
  const vendors = (data?.vendors ?? []) as any[];

  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d; });
  const trend = months.map((d) => {
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const spend = pos.filter((p) => { const x = new Date(p.created_at); return `${x.getFullYear()}-${x.getMonth()}` === k; }).reduce((s, p) => s + Number(p.total_amount), 0);
    const created = rfqs.filter((r) => { const x = new Date(r.created_at); return `${x.getFullYear()}-${x.getMonth()}` === k; }).length;
    return { month: d.toLocaleString("en-IN", { month: "short" }), spend: Math.round(spend / 1000), rfqs: created };
  });

  const approved = app.filter((a) => a.decision === "approved").length;
  const total = app.length || 1;
  const successRate = Math.round((approved / total) * 100);

  const vendorPerf = vendors.slice(0, 8).map((v) => ({ name: v.company_name.slice(0, 12), rating: Number(v.rating), risk: Number(v.risk_score) }));

  const exportCsv = () => {
    const csv = ["month,spend(k),rfqs", ...trend.map((t) => `${t.month},${t.spend},${t.rfqs}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vendorbridge-trends-${fmtDate(new Date())}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1><p className="text-muted-foreground">Spend, performance and approval velocity.</p></div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Total spend (6m)</div><div className="text-3xl font-bold mt-2">{inr(pos.reduce((s, p) => s + Number(p.total_amount), 0))}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">RFQs raised</div><div className="text-3xl font-bold mt-2">{rfqs.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Approval success rate</div><div className="text-3xl font-bold mt-2 text-success">{successRate}%</div></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold">Procurement trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend}>
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(220,80%,60%)" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(220,80%,60%)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
            <Area type="monotone" dataKey="spend" stroke="hsl(220,80%,55%)" fill="url(#g2)" name="Spend (k)" />
            <Area type="monotone" dataKey="rfqs" stroke="hsl(150,60%,45%)" fill="hsl(150,60%,45%)" fillOpacity={0.2} name="RFQs" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold">Vendor performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendorPerf}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar dataKey="rating" fill="hsl(150,60%,45%)" name="Rating" radius={[4, 4, 0, 0]} /><Bar dataKey="risk" fill="hsl(0,80%,60%)" name="Risk" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Predicted next month spend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={[...trend, { month: "Predict", spend: Math.round(trend.reduce((s, t) => s + t.spend, 0) / Math.max(trend.length, 1) * 1.08), rfqs: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line type="monotone" dataKey="spend" stroke="hsl(220,80%,55%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">AI-assisted forward projection based on the last 6 months.</p>
        </Card>
      </div>
    </div>
  );
}
