import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — VendorBridge" }] }),
  component: Approvals,
});

function Approvals() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["approvals-all"],
    queryFn: async () => (await supabase.from("approvals").select("*, rfqs(rfq_number,title), quotations(price, vendors(company_name))").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Approvals</h1><p className="text-muted-foreground">Decisions across all RFQs.</p></div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>RFQ</TableHead><TableHead>Vendor</TableHead><TableHead>Price</TableHead><TableHead>Decision</TableHead><TableHead>Decided</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No approvals.</TableCell></TableRow>}
            {(rows as any[]).map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link to="/rfqs/$id" params={{ id: a.rfq_id }} className="font-medium hover:underline">{a.rfqs?.title}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{a.rfqs?.rfq_number}</div>
                </TableCell>
                <TableCell>{a.quotations?.vendors?.company_name ?? "—"}</TableCell>
                <TableCell>{a.quotations?.price ? `₹${Number(a.quotations.price).toLocaleString("en-IN")}` : "—"}</TableCell>
                <TableCell><Badge variant={a.decision === "approved" ? "default" : a.decision === "rejected" ? "destructive" : "outline"} className="capitalize">{a.decision.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs">{fmtDateTime(a.decided_at ?? a.created_at)}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{a.remarks ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
