import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { inr, fmtDate } from "@/lib/utils";
import { Download, Printer, Plus, Mail } from "lucide-react";
import { downloadErpDoc, printErpDoc } from "@/components/erp-doc";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — VendorBridge" }] }),
  component: Invoices,
});

function Invoices() {
  const qc = useQueryClient();
  const { user, isStaff } = useAuth();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, vendors(*), purchase_orders(po_number,rfq_id,rfqs(title,quantity))").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: pos = [] } = useQuery({ queryKey: ["pos-for-inv"], queryFn: async () => (await supabase.from("purchase_orders").select("*, vendors(*), rfqs(title,quantity)").not("status", "in", "(cancelled)").order("created_at", { ascending: false })).data ?? [] });

  const generateFromPO = async (po: any) => {
    const subtotal = Number(po.total_amount);
    const cgst = +(subtotal * 0.09).toFixed(2);
    const sgst = +(subtotal * 0.09).toFixed(2);
    const total = subtotal + cgst + sgst;
    const { data, error } = await supabase.from("invoices").insert({
      po_id: po.id, vendor_id: po.vendor_id, subtotal, cgst, sgst, igst: 0, total,
      status: "sent", due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), created_by: user!.id,
    }).select().single();
    if (error || !data) return toast.error(error?.message ?? "Failed");
    toast.success(`Invoice ${data.invoice_number} generated`);
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };

  const docProps = (inv: any) => ({
    kind: "INVOICE" as const, number: inv.invoice_number, date: fmtDate(inv.issued_at),
    vendor: { name: inv.vendors?.company_name ?? "Vendor", gst: inv.vendors?.gst_number, address: inv.vendors?.address, email: inv.vendors?.email },
    items: [{ description: inv.purchase_orders?.rfqs?.title ?? "Procurement", qty: inv.purchase_orders?.rfqs?.quantity ?? 1, rate: Number(inv.subtotal) / (inv.purchase_orders?.rfqs?.quantity ?? 1) }],
    subtotal: Number(inv.subtotal), cgst: Number(inv.cgst), sgst: Number(inv.sgst), igst: Number(inv.igst), total: Number(inv.total),
  });

  const emailInvoice = (inv: any) => {
    const subject = encodeURIComponent(`Invoice ${inv.invoice_number} from VendorBridge`);
    const body = encodeURIComponent(`Hi ${inv.vendors?.contact_person ?? "team"},\n\nPlease find invoice ${inv.invoice_number} for ${inr(inv.total)}.\n\nRegards,\nVendorBridge`);
    window.location.href = `mailto:${inv.vendors?.email ?? ""}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">Invoices</h1><p className="text-muted-foreground">Auto-numbered, GST-ready invoices.</p></div>
      </div>

      {isStaff && pos.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">Generate from delivered POs</div>
          <div className="flex flex-wrap gap-2">
            {(pos as any[]).filter((p) => !(invoices as any[]).some((i) => i.po_id === p.id)).slice(0, 8).map((p) => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => generateFromPO(p)}><Plus className="h-3 w-3 mr-1" />{p.po_number} • {inr(p.total_amount)}</Button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Vendor</TableHead><TableHead>Subtotal</TableHead><TableHead>GST</TableHead><TableHead>Total</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && invoices.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            {(invoices as any[]).map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                <TableCell>{inv.vendors?.company_name}</TableCell>
                <TableCell>{inr(inv.subtotal)}</TableCell>
                <TableCell>{inr(Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst))}</TableCell>
                <TableCell className="font-semibold">{inr(inv.total)}</TableCell>
                <TableCell>{fmtDate(inv.due_date)}</TableCell>
                <TableCell><Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "outline"} className="capitalize">{inv.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="icon" variant="ghost" onClick={() => downloadErpDoc(docProps(inv), `${inv.invoice_number}.pdf`)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => printErpDoc(docProps(inv))}><Printer className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => emailInvoice(inv)}><Mail className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
