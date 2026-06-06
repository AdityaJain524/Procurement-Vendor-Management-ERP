import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat, aiFraudReport } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot, User as UserIcon, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — VendorBridge" }] }),
  component: AiPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AiPage() {
  const chat = useServerFn(aiChat);
  const fraud = useServerFn(aiFraudReport);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Hi! I'm your procurement assistant. Ask me about vendors, RFQs, pending approvals, spend, or fraud signals." }]);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [fraudOut, setFraudOut] = useState("");

  const send = async () => {
    if (!input.trim() || busy) return;
    const next = [...msgs, { role: "user", content: input } as Msg];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      // Live snapshot context (light)
      const [{ data: vendors }, { data: rfqs }, { data: pos }, { data: pending }] = await Promise.all([
        supabase.from("vendors").select("company_name,rating,risk_score,status,category").limit(50),
        supabase.from("rfqs").select("rfq_number,title,status,budget").order("created_at",{ascending:false}).limit(20),
        supabase.from("purchase_orders").select("po_number,total_amount,status").limit(20),
        supabase.from("approvals").select("id,decision").eq("decision","pending"),
      ]);
      const ctx = `Vendors(${vendors?.length}): ${JSON.stringify(vendors?.slice(0,15))}\nRFQs(${rfqs?.length}): ${JSON.stringify(rfqs?.slice(0,10))}\nPOs(${pos?.length}): ${JSON.stringify(pos?.slice(0,10))}\nPending approvals: ${pending?.length}`;
      const res = await chat({ data: { messages: next, context: ctx } });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const runFraud = async () => {
    setBusy(true); setFraudOut("");
    try {
      const [{ data: vendors }, { data: quotes }, { data: pos }] = await Promise.all([
        supabase.from("vendors").select("gst_number"),
        supabase.from("quotations").select("rfq_id,vendor_id,price,status,vendors(company_name)"),
        supabase.from("purchase_orders").select("vendor_id,total_amount,created_at"),
      ]);
      const gsts = (vendors ?? []).map((v: any) => v.gst_number).filter(Boolean);
      const dupGst = gsts.length - new Set(gsts).size;
      const winsByVendor: Record<string, { name: string; wins: number }> = {};
      (quotes ?? []).filter((q: any) => q.status === "awarded").forEach((q: any) => {
        const k = q.vendor_id; winsByVendor[k] ??= { name: q.vendors?.company_name ?? "?", wins: 0 }; winsByVendor[k].wins++;
      });
      const repeated = Object.values(winsByVendor).filter((v) => v.wins >= 3);
      const byRfq: Record<string, number[]> = {};
      (quotes ?? []).forEach((q: any) => { byRfq[q.rfq_id] ??= []; byRfq[q.rfq_id].push(Number(q.price)); });
      const abnormal = Object.entries(byRfq).filter(([, arr]) => arr.length > 1).map(([rfq, arr]) => ({ rfq, spread_pct: Math.round(((Math.max(...arr) - Math.min(...arr)) / Math.min(...arr)) * 100) })).filter((x) => x.spread_pct > 80);
      const thisMonth = (pos ?? []).filter((p: any) => new Date(p.created_at).getMonth() === new Date().getMonth()).reduce((s: number, p: any) => s + Number(p.total_amount), 0);
      const lastMonth = (pos ?? []).filter((p: any) => new Date(p.created_at).getMonth() === (new Date().getMonth() + 11) % 12).reduce((s: number, p: any) => s + Number(p.total_amount), 0);
      const spike = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
      const r = await fraud({ data: { signal: { duplicate_gst: dupGst, repeated_winners: repeated, abnormal_quotes: abnormal, spending_spike_pct: spike } } });
      setFraudOut(r.reply);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1><p className="text-muted-foreground">Ask anything about your procurement, or run a fraud scan.</p></div>
        <Button variant="outline" onClick={runFraud} disabled={busy}><ShieldAlert className="h-4 w-4 mr-1" />Run fraud detection</Button>
      </div>
      {fraudOut && <Card className="p-5 border-warning"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Fraud signals</div><div className="whitespace-pre-wrap text-sm">{fraudOut}</div></Card>}
      <Card className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="h-8 w-8 rounded-md grid place-items-center gradient-primary text-primary-foreground shrink-0"><Bot className="h-4 w-4" /></div>}
              <div className={`max-w-2xl rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
              {m.role === "user" && <div className="h-8 w-8 rounded-md bg-secondary grid place-items-center shrink-0"><UserIcon className="h-4 w-4" /></div>}
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />Thinking…</div>}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about pending approvals, top vendors, spend…" disabled={busy} />
          <Button onClick={send} disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
