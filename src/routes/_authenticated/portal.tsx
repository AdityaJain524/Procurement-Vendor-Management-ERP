import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { fmtDate, inr } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Vendor Portal — VendorBridge" }] }),
  component: Portal,
});

function Portal() {
  const { user } = useAuth();
  const { data: vendor } = useQuery({
    queryKey: ["my-vendor", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("vendors").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: invites = [] } = useQuery({
    queryKey: ["my-invites", vendor?.id], enabled: !!vendor,
    queryFn: async () => (await supabase.from("rfq_vendors").select("rfq:rfqs(*)").eq("vendor_id", vendor!.id)).data ?? [],
  });
  const { data: pos = [] } = useQuery({
    queryKey: ["my-pos", vendor?.id], enabled: !!vendor,
    queryFn: async () => (await supabase.from("purchase_orders").select("*").eq("vendor_id", vendor!.id).order("created_at", { ascending: false })).data ?? [],
  });

  if (!vendor) {
    return (
      <Card className="p-6 max-w-xl">
        <h2 className="font-semibold text-lg">No vendor profile linked</h2>
        <p className="text-sm text-muted-foreground mt-1">Your account isn't connected to a vendor record yet. Ask the procurement team to add you (use this email when creating the vendor) so RFQs appear here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Vendor Portal</h1><p className="text-muted-foreground">{vendor.company_name} — your RFQs and POs.</p></div>
      <Card>
        <div className="p-4 border-b"><h3 className="font-semibold">Assigned RFQs</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>RFQ #</TableHead><TableHead>Title</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {(invites as any[]).map((iv) => (
              <TableRow key={iv.rfq.id} className="cursor-pointer hover:bg-accent/40" onClick={() => location.assign(`/rfqs/${iv.rfq.id}`)}>
                <TableCell className="font-mono text-xs">{iv.rfq.rfq_number}</TableCell>
                <TableCell className="font-medium">{iv.rfq.title}</TableCell>
                <TableCell>{fmtDate(iv.rfq.deadline)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{iv.rfq.status.replace("_", " ")}</Badge></TableCell>
              </TableRow>
            ))}
            {invites.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No invitations yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Card>
        <div className="p-4 border-b"><h3 className="font-semibold">My purchase orders</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Amount</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {(pos as any[]).map((p) => (
              <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.po_number}</TableCell><TableCell>{inr(p.total_amount)}</TableCell><TableCell>{fmtDate(p.expected_delivery)}</TableCell><TableCell><Badge variant="outline" className="capitalize">{p.status.replace("_", " ")}</Badge></TableCell></TableRow>
            ))}
            {pos.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No POs yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
