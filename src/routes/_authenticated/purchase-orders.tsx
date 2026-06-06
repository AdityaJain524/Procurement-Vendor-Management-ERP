import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { inr, fmtDate } from "@/lib/utils";
import { Download, Printer } from "lucide-react";
import { downloadErpDoc, printErpDoc } from "@/components/erp-doc";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — VendorBridge" }] }),
  component: PoList,
});

function PoList() {
  const { data: pos = [], isLoading } = useQuery({
    queryKey: ["pos"],
    queryFn: async () => (await supabase.from("purchase_orders").select("*, vendors(*), rfqs(title,rfq_number,quantity)").order("created_at", { ascending: false })).data ?? [],
  });

  const docProps = (po: any) => ({
    kind: "PO" as const, number: po.po_number, date: fmtDate(po.created_at),
    vendor: { name: po.vendors?.company_name ?? "Vendor", gst: po.vendors?.gst_number, address: po.vendors?.address, email: po.vendors?.email },
    items: [{ description: po.rfqs?.title ?? "Procurement item", qty: po.rfqs?.quantity ?? 1, rate: Number(po.total_amount) / (po.rfqs?.quantity ?? 1) }],
    subtotal: Number(po.total_amount), total: Number(po.total_amount), terms: po.terms ?? "Net 30 days. Goods inspected on delivery.",
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1><p className="text-muted-foreground">Issued POs and their delivery status.</p></div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Reference</TableHead><TableHead>Amount</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && pos.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No POs yet. Approve an RFQ to generate one.</TableCell></TableRow>}
            {(pos as any[]).map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                <TableCell>{po.vendors?.company_name}</TableCell>
                <TableCell className="text-xs">{po.rfqs?.rfq_number}</TableCell>
                <TableCell>{inr(po.total_amount)}</TableCell>
                <TableCell>{fmtDate(po.expected_delivery)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{po.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => downloadErpDoc(docProps(po), `${po.po_number}.pdf`)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => printErpDoc(docProps(po))}><Printer className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
