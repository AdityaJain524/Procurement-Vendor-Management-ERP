import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { aiRecommendVendor } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { fmtDate, fmtDateTime, inr } from "@/lib/utils";
import { Award, CheckCircle2, ChevronLeft, Clock, ShieldAlert, Sparkles, Star, ThumbsDown, ThumbsUp, Undo2, Truck, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rfqs/$id")({
  head: () => ({ meta: [{ title: "RFQ — VendorBridge" }] }),
  component: RfqDetail,
});

function RfqDetail() {
  const { id } = Route.useParams();
  const { user, isStaff, hasRole } = useAuth();
  const qc = useQueryClient();
  const recommend = useServerFn(aiRecommendVendor);
  const [aiOut, setAiOut] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "delivery" | "rating">("price");

  const { data: rfq } = useQuery({ queryKey: ["rfq", id], queryFn: async () => (await supabase.from("rfqs").select("*").eq("id", id).maybeSingle()).data });
  const { data: invites = [] } = useQuery({ queryKey: ["rfq-invites", id], queryFn: async () => (await supabase.from("rfq_vendors").select("*, vendors(*)").eq("rfq_id", id)).data ?? [] });
  const { data: quotes = [] } = useQuery({ queryKey: ["rfq-quotes", id], queryFn: async () => (await supabase.from("quotations").select("*, vendors(*)").eq("rfq_id", id)).data ?? [] });

  const sortedQuotes = [...(quotes as any[])].sort((a, b) => {
    if (sortBy === "price") return Number(a.price) - Number(b.price);
    if (sortBy === "delivery") return Number(a.delivery_days) - Number(b.delivery_days);
    if (sortBy === "rating") return Number(b.vendors?.rating ?? 0) - Number(a.vendors?.rating ?? 0);
    return 0;
  });
  const { data: approvals = [] } = useQuery({ queryKey: ["rfq-approvals", id], queryFn: async () => (await supabase.from("approvals").select("*").eq("rfq_id", id).order("created_at", { ascending: false })).data ?? [] });

  const myVendorRow = (invites as any[]).find((x) => x.vendors?.user_id === user?.id);
  const myQuote = (quotes as any[]).find((q) => q.vendors?.user_id === user?.id);

  if (!rfq) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const minPrice = Math.min(...(quotes as any[]).map((q) => Number(q.price)));
  const minDays = Math.min(...(quotes as any[]).map((q) => Number(q.delivery_days)));
  const maxRating = Math.max(...(quotes as any[]).map((q) => Number(q.vendors?.rating ?? 0)));

  const requestApproval = async (qid: string) => {
    if (!user) return;
    const { error } = await supabase.from("approvals").insert({ rfq_id: id, quotation_id: qid, decision: "pending" });
    if (error) return toast.error(error.message);
    await supabase.from("rfqs").update({ status: "under_review" }).eq("id", id);
    // notify managers
    const { data: mgrs } = await supabase.from("user_roles").select("user_id").eq("role", "manager");
    if (mgrs?.length) await supabase.from("notifications").insert(mgrs.map((m: any) => ({ user_id: m.user_id, title: "Approval needed", body: `${rfq.rfq_number} awaiting your decision`, link: `/rfqs/${id}` })));
    toast.success("Sent for approval");
    qc.invalidateQueries({ queryKey: ["rfq-approvals", id] }); qc.invalidateQueries({ queryKey: ["rfq", id] });
  };

  const decide = async (aid: string, decision: "approved" | "rejected" | "sent_back", remarks: string) => {
    await supabase.from("approvals").update({ decision, remarks, decided_at: new Date().toISOString(), approver_id: user!.id }).eq("id", aid);
    if (decision === "approved") {
      const a = (approvals as any[]).find((x) => x.id === aid);
      const q = (quotes as any[]).find((x) => x.id === a?.quotation_id);
      await supabase.from("rfqs").update({ status: "approved", awarded_quotation_id: q?.id }).eq("id", id);
      await supabase.from("quotations").update({ status: "awarded" }).eq("id", q!.id);
    } else if (decision === "rejected") {
      await supabase.from("rfqs").update({ status: "rejected" }).eq("id", id);
    } else {
      await supabase.from("rfqs").update({ status: "submitted" }).eq("id", id);
    }
    toast.success("Decision recorded");
    qc.invalidateQueries({ queryKey: ["rfq-approvals", id] }); qc.invalidateQueries({ queryKey: ["rfq", id] }); qc.invalidateQueries({ queryKey: ["rfq-quotes", id] });
  };

  const generatePO = async () => {
    const awarded = (quotes as any[]).find((q) => q.id === rfq.awarded_quotation_id);
    if (!awarded) return toast.error("No awarded quotation");
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      rfq_id: rfq.id, quotation_id: awarded.id, vendor_id: awarded.vendor_id,
      total_amount: Number(awarded.price) * Number(rfq.quantity), status: "issued", created_by: user!.id,
      expected_delivery: new Date(Date.now() + awarded.delivery_days * 86400000).toISOString().slice(0, 10),
    }).select().single();
    if (error || !po) return toast.error(error?.message ?? "Failed");
    await supabase.from("rfqs").update({ status: "completed" }).eq("id", rfq.id);
    if (awarded.vendors?.user_id) await supabase.from("notifications").insert({ user_id: awarded.vendors.user_id, title: "Purchase Order issued", body: po.po_number, link: `/purchase-orders` });
    toast.success(`PO ${po.po_number} generated`);
    qc.invalidateQueries({ queryKey: ["rfq", id] });
  };

  const runAi = async () => {
    if (quotes.length === 0) return;
    setAiBusy(true); setAiOut("");
    try {
      const res = await recommend({ data: {
        rfq: { title: rfq.title, description: rfq.description, budget: rfq.budget ? Number(rfq.budget) : undefined, quantity: rfq.quantity },
        quotations: (quotes as any[]).map((q) => ({
          vendor: q.vendors?.company_name ?? "Vendor", price: Number(q.price), delivery_days: q.delivery_days,
          warranty_months: q.warranty_months, rating: Number(q.vendors?.rating ?? 0), risk_score: Number(q.vendors?.risk_score ?? 0),
        })),
      } });
      setAiOut(res.reply);
    } catch (e: any) { toast.error(e.message); } finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/rfqs" className="text-sm text-muted-foreground inline-flex items-center hover:text-foreground"><ChevronLeft className="h-4 w-4" />Back to RFQs</Link>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{rfq.title}</h1>
          <div className="text-sm text-muted-foreground font-mono">{rfq.rfq_number}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{rfq.status.replace("_", " ")}</Badge>
          {rfq.status === "approved" && (hasRole("procurement_officer") || hasRole("admin")) && (
            <Button onClick={generatePO}><Receipt className="h-4 w-4 mr-1" />Generate PO</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold">Details</h3>
          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
            <div><div className="text-muted-foreground text-xs">Quantity</div><div className="font-medium">{rfq.quantity}</div></div>
            <div><div className="text-muted-foreground text-xs">Budget</div><div className="font-medium">{rfq.budget ? inr(rfq.budget) : "—"}</div></div>
            <div><div className="text-muted-foreground text-xs">Deadline</div><div className="font-medium">{fmtDateTime(rfq.deadline)}</div></div>
          </div>
          {rfq.description && <><div className="text-xs text-muted-foreground mt-4">Description</div><p className="text-sm mt-1 whitespace-pre-wrap">{rfq.description}</p></>}
          {rfq.product_details && <><div className="text-xs text-muted-foreground mt-4">Product details</div><p className="text-sm mt-1 whitespace-pre-wrap">{rfq.product_details}</p></>}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Invited vendors</h3>
          <div className="mt-3 space-y-2">
            {(invites as any[]).map((iv) => {
              const submitted = (quotes as any[]).some((q) => q.vendor_id === iv.vendor_id);
              return (
                <div key={iv.id} className="flex items-center justify-between text-sm">
                  <div><div className="font-medium">{iv.vendors?.company_name}</div><div className="text-xs text-muted-foreground capitalize">{iv.vendors?.category}</div></div>
                  {submitted ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Submitted</Badge> : <Badge variant="outline">Pending</Badge>}
                </div>
              );
            })}
            {invites.length === 0 && <div className="text-sm text-muted-foreground">No vendors invited.</div>}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="quotes">
        <TabsList><TabsTrigger value="quotes">Quotations ({quotes.length})</TabsTrigger><TabsTrigger value="approvals">Approvals ({approvals.length})</TabsTrigger>{myVendorRow && <TabsTrigger value="submit">My quotation</TabsTrigger>}</TabsList>

        <TabsContent value="quotes">
          <Card>
            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">Comparison matrix</h3>
              <div className="flex items-center gap-2">
                {quotes.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                    <span>Sort by:</span>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price (Low)</SelectItem>
                        <SelectItem value="delivery">Delivery (Fast)</SelectItem>
                        <SelectItem value="rating">Rating (High)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isStaff && quotes.length > 0 && (
                  <Button variant="outline" size="sm" onClick={runAi} disabled={aiBusy}><Sparkles className="h-4 w-4 mr-1" />{aiBusy ? "Analyzing…" : "AI recommend"}</Button>
                )}
              </div>
            </div>
            {aiOut && <div className="mx-4 mb-4 rounded-lg border bg-accent/30 p-4 text-sm whitespace-pre-wrap"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI recommendation</div>{aiOut}</div>}
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Price</TableHead><TableHead>Delivery</TableHead><TableHead>Warranty</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {quotes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No quotations yet.</TableCell></TableRow>}
                {(sortedQuotes as any[]).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell><div className="font-medium">{q.vendors?.company_name}</div><div className="text-xs text-muted-foreground">{fmtDateTime(q.created_at)}</div></TableCell>
                    <TableCell><div className={Number(q.price) === minPrice ? "font-semibold text-success" : ""}>{inr(q.price)}{Number(q.price) === minPrice && <Badge variant="secondary" className="ml-2 text-[10px]"><Award className="h-3 w-3 mr-0.5" />Best</Badge>}</div></TableCell>
                    <TableCell><span className={q.delivery_days === minDays ? "font-semibold text-info" : ""}>{q.delivery_days}d{q.delivery_days === minDays && <Truck className="inline h-3 w-3 ml-1" />}</span></TableCell>
                    <TableCell>{q.warranty_months}mo</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{Number(q.vendors?.rating ?? 0).toFixed(1)}{Number(q.vendors?.rating ?? 0) === maxRating && maxRating > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">Top</Badge>}</span></TableCell>
                    <TableCell><Badge variant={q.status === "awarded" ? "default" : "outline"} className="capitalize">{q.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {isStaff && rfq.status !== "completed" && rfq.status !== "approved" && (
                        <Button size="sm" variant="outline" onClick={() => requestApproval(q.id)}>Request approval</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Approval timeline</h3>
            <div className="space-y-3">
              {(approvals as any[]).map((a) => {
                const q = (quotes as any[]).find((x) => x.id === a.quotation_id);
                return (
                  <div key={a.id} className="flex items-start gap-3 border-l-2 pl-4" style={{ borderColor: a.decision === "approved" ? "hsl(150 60% 50%)" : a.decision === "rejected" ? "hsl(0 80% 60%)" : "hsl(220 80% 60%)" }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize flex items-center gap-2">{a.decision.replace("_", " ")}{q && <Badge variant="outline">{q.vendors?.company_name}</Badge>}</div>
                      <div className="text-xs text-muted-foreground">{fmtDateTime(a.decided_at ?? a.created_at)}</div>
                      {a.remarks && <p className="text-sm mt-1 text-muted-foreground">"{a.remarks}"</p>}
                    </div>
                    {a.decision === "pending" && (hasRole("manager") || hasRole("admin")) && <DecisionButtons onDecide={(d, r) => decide(a.id, d, r)} />}
                  </div>
                );
              })}
              {approvals.length === 0 && <div className="text-sm text-muted-foreground">No approvals requested yet.</div>}
            </div>
          </Card>
        </TabsContent>

        {myVendorRow && (
          <TabsContent value="submit">
            <Card className="p-5"><VendorQuoteForm rfqId={id} vendorId={myVendorRow.vendor_id} existing={myQuote} deadline={rfq.deadline} /></Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function DecisionButtons({ onDecide }: { onDecide: (d: "approved" | "rejected" | "sent_back", remarks: string) => void }) {
  const [mode, setMode] = useState<null | "approved" | "rejected" | "sent_back">(null);
  const [remarks, setRemarks] = useState("");
  return (
    <Dialog open={mode != null} onOpenChange={(o) => !o && setMode(null)}>
      <div className="flex gap-1">
        <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setMode("approved")}><ThumbsUp className="h-4 w-4 mr-1" />Approve</Button></DialogTrigger>
        <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setMode("sent_back")}><Undo2 className="h-4 w-4 mr-1" />Send back</Button></DialogTrigger>
        <DialogTrigger asChild><Button size="sm" variant="destructive" onClick={() => setMode("rejected")}><ThumbsDown className="h-4 w-4 mr-1" />Reject</Button></DialogTrigger>
      </div>
      <DialogContent><DialogHeader><DialogTitle className="capitalize">{mode?.replace("_", " ")}</DialogTitle></DialogHeader>
        <Label>Remarks</Label><Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <DialogFooter><Button onClick={() => { onDecide(mode!, remarks); setMode(null); setRemarks(""); }}>Confirm</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorQuoteForm({ rfqId, vendorId, existing, deadline }: { rfqId: string; vendorId: string; existing: any; deadline: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [price, setPrice] = useState(existing?.price ?? "");
  const [days, setDays] = useState(existing?.delivery_days ?? "");
  const [warranty, setWarranty] = useState(existing?.warranty_months ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const expired = new Date(deadline) < new Date();
  const submit = async () => {
    const payload = { rfq_id: rfqId, vendor_id: vendorId, price: Number(price), delivery_days: Number(days), warranty_months: Number(warranty || 0), notes: notes || null, submitted_by: user!.id };
    const { error } = existing ? await supabase.from("quotations").update(payload).eq("id", existing.id) : await supabase.from("quotations").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Quotation updated" : "Quotation submitted");
    qc.invalidateQueries({ queryKey: ["rfq-quotes", rfqId] });
  };
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Your quotation</h3>
      {expired && <div className="text-xs text-warning flex items-center gap-1"><Clock className="h-3 w-3" />Deadline passed — submissions locked.</div>}
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Price (₹)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={expired} /></div>
        <div><Label>Delivery (days)</Label><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} disabled={expired} /></div>
        <div><Label>Warranty (months)</Label><Input type="number" value={warranty} onChange={(e) => setWarranty(e.target.value)} disabled={expired} /></div>
      </div>
      <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={expired} /></div>
      <Button onClick={submit} disabled={expired || !price || !days}>{existing ? "Update quotation" : "Submit quotation"}</Button>
      <div className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Quotation locks at deadline: {fmtDate(deadline)}</div>
    </div>
  );
}
