import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { inr, compactNum, fmtDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  Users2, ClipboardList, FileCheck2, Receipt, FileText, IndianRupee, Plus, ArrowUpRight, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — VendorBridge" }] }),
  component: Dashboard,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [vendors, rfqs, pos, invoices, pendingApprovals, quotations] = await Promise.all([
        supabase.from("vendors").select("id,status,rating,risk_score,company_name,category", { count: "exact" }),
        supabase.from("rfqs").select("id,status,created_at,title,deadline").order("created_at", { ascending: false }),
        supabase.from("purchase_orders").select("id,total_amount,created_at,status,po_number,vendor_id"),
        supabase.from("invoices").select("id,total,status,created_at,invoice_number"),
        supabase.from("approvals").select("id", { count: "exact" }).eq("decision", "pending"),
        supabase.from("quotations").select("id,price,delivery_days,vendor_id,rfq_id,status,created_at"),
      ]);
      return { vendors: vendors.data ?? [], rfqs: rfqs.data ?? [], pos: pos.data ?? [], invoices: invoices.data ?? [], pendingApprovals: pendingApprovals.count ?? 0, quotations: quotations.data ?? [] };
    },
  });
}

function Dashboard() {
  const { profile, hasRole } = useAuth();
  const { data, isLoading } = useStats();
  const monthlySpend = (data?.pos ?? []).filter((p: any) => new Date(p.created_at).getMonth() === new Date().getMonth()).reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const activeRfqs = (data?.rfqs ?? []).filter((r: any) => ["open", "submitted", "under_review"].includes(r.status)).length;

  // Monthly trend (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-IN", { month: "short" }) };
  });
  const spendByMonth = months.map((m) => {
    const total = (data?.pos ?? []).filter((p: any) => { const d = new Date(p.created_at); return `${d.getFullYear()}-${d.getMonth()}` === m.key; }).reduce((s: number, p: any) => s + Number(p.total_amount), 0);
    const rfqs = (data?.rfqs ?? []).filter((r: any) => { const d = new Date(r.created_at); return `${d.getFullYear()}-${d.getMonth()}` === m.key; }).length;
    return { month: m.label, spend: Math.round(total / 1000), rfqs };
  });
  const statusDist = ["draft", "open", "under_review", "approved", "rejected", "completed"].map((s) => ({
    name: s.replace("_", " "), value: (data?.rfqs ?? []).filter((r: any) => r.status === s).length,
  }));
  const PIE = ["hsl(220,80%,60%)", "hsl(200,80%,55%)", "hsl(40,90%,60%)", "hsl(150,60%,50%)", "hsl(0,80%,60%)", "hsl(265,60%,60%)"];

  const cards = [
    { label: "Total Vendors", value: data?.vendors.length ?? 0, icon: Users2, hint: `${data?.vendors.filter((v: any) => v.status === "active").length ?? 0} active` },
    { label: "Active RFQs", value: activeRfqs, icon: ClipboardList, hint: `${data?.rfqs.length ?? 0} total` },
    { label: "Pending Approvals", value: data?.pendingApprovals ?? 0, icon: FileCheck2, hint: "awaiting decision" },
    { label: "Purchase Orders", value: data?.pos.length ?? 0, icon: Receipt, hint: `${data?.pos.filter((p: any) => p.status === "delivered").length ?? 0} delivered` },
    { label: "Invoices", value: data?.invoices.length ?? 0, icon: FileText, hint: `${data?.invoices.filter((i: any) => i.status === "paid").length ?? 0} paid` },
    { label: "This Month Spend", value: inr(monthlySpend), icon: IndianRupee, hint: "across all POs" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your procurement.</p>
        </div>
        <div className="flex gap-2">
          {hasRole("procurement_officer") || hasRole("admin") ? (
            <Link to="/rfqs/new"><Button><Plus className="h-4 w-4 mr-1" />Create RFQ</Button></Link>
          ) : null}
          <Link to="/vendors"><Button variant="outline">Add Vendor</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 shadow-card hover:shadow-elegant transition-shadow">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{c.label}</span><c.icon className="h-4 w-4 text-primary" /></div>
            <div className="text-2xl font-bold mt-2">{isLoading ? "—" : typeof c.value === "number" ? compactNum(c.value) : c.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{c.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold">Spending trend</h3><p className="text-xs text-muted-foreground">PO value (in thousands)</p></div>
            <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" />last 6m</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={spendByMonth}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(220,80%,60%)" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(220,80%,60%)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip />
              <Area type="monotone" dataKey="spend" stroke="hsl(220,80%,55%)" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">RFQ status</h3><p className="text-xs text-muted-foreground">Distribution by stage</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                {statusDist.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Procurement volume</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendByMonth}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Bar dataKey="rfqs" fill="hsl(220,80%,55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Recent RFQs</h3><Link to="/rfqs" className="text-xs text-primary inline-flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link></div>
          <div className="divide-y">
            {(data?.rfqs ?? []).slice(0, 6).map((r: any) => (
              <Link key={r.id} to="/rfqs/$id" params={{ id: r.id }} className="flex items-center justify-between py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded">
                <div><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-muted-foreground">due {fmtDate(r.deadline)}</div></div>
                <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
              </Link>
            ))}
            {(data?.rfqs ?? []).length === 0 && <div className="py-6 text-sm text-center text-muted-foreground">No RFQs yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
