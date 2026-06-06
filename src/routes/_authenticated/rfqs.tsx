import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { fmtDate, inr } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rfqs")({
  head: () => ({ meta: [{ title: "RFQs — VendorBridge" }] }),
  component: RfqList,
});

const statuses = ["draft", "open", "submitted", "under_review", "approved", "rejected", "completed"] as const;

function RfqList() {
  const { isStaff } = useAuth();
  const [q, setQ] = useState(""); const [st, setSt] = useState("all");
  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ["rfqs"],
    queryFn: async () => (await supabase.from("rfqs").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = (rfqs as any[]).filter((r) =>
    (st === "all" || r.status === st) && (!q || r.title.toLowerCase().includes(q.toLowerCase()) || r.rfq_number.includes(q))
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">Request for Quotations</h1><p className="text-muted-foreground">Source from vendors with structured workflows.</p></div>
        {isStaff && <Link to="/rfqs/new"><Button><Plus className="h-4 w-4 mr-1" />New RFQ</Button></Link>}
      </div>
      <Card className="p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search title or RFQ #" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={st} onValueChange={setSt}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All status</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>RFQ #</TableHead><TableHead>Title</TableHead><TableHead>Qty</TableHead><TableHead>Budget</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">No RFQs yet.</TableCell></TableRow>}
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-accent/40" onClick={() => location.assign(`/rfqs/${r.id}`)}>
                <TableCell className="font-mono text-xs">{r.rfq_number}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.budget ? inr(r.budget) : "—"}</TableCell>
                <TableCell>{fmtDate(r.deadline)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// New RFQ + detail screens live in their own route files.
