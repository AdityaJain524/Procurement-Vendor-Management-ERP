import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Boxes, ClipboardList, FileCheck2, FileText, Gauge, ShieldCheck, Sparkles, Users2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VendorBridge — Procurement & Vendor Management ERP" },
      { name: "description", content: "AI-powered procurement: RFQs, quotations, approvals, POs, invoices, analytics." },
      { property: "og:title", content: "VendorBridge — Procurement ERP" },
      { property: "og:description", content: "End-to-end procurement, beautifully." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users2, title: "Vendor Management", desc: "Onboard, rate, categorize and score risk for every supplier." },
  { icon: ClipboardList, title: "RFQ Workflow", desc: "Create RFQs, invite vendors, collect quotations on time." },
  { icon: Gauge, title: "Smart Comparison", desc: "Price, delivery, warranty and rating in one matrix." },
  { icon: FileCheck2, title: "Multi-stage Approvals", desc: "Managers approve, reject, send back with remarks." },
  { icon: FileText, title: "PO & Invoices", desc: "Auto-numbered, branded PDFs you can email or print." },
  { icon: Sparkles, title: "AI Insights", desc: "Vendor recommendation, fraud detection, predictive analytics." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-primary-foreground"><Boxes className="h-5 w-5" /></div>
            <span className="font-bold text-lg tracking-tight">VendorBridge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#roles" className="hover:text-foreground">Roles</a>
            <a href="#ai" className="hover:text-foreground">AI</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Enterprise procurement, reimagined
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Run procurement end-to-end. <span className="opacity-80">Beautifully.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            VendorBridge unifies vendors, RFQs, approvals, purchase orders and invoices with AI-powered insights, fraud detection and real-time collaboration.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" className="bg-white text-primary hover:bg-white/90">Launch console</Button></Link>
            <a href="#features"><Button size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10">See features</Button></a>
          </div>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            {[["120+","Vendors"],["98%","On-time"],["32%","Cost saved"],["4.8★","Avg rating"]].map(([n,l]) => (
              <div key={l}><div className="text-3xl font-bold">{n}</div><div className="text-sm text-primary-foreground/70">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Every procurement step in one console</h2>
        <p className="mt-3 text-muted-foreground max-w-2xl">From sourcing to invoicing, with audit trails and analytics out of the box.</p>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6 shadow-card hover:shadow-elegant transition-shadow">
              <div className="grid h-10 w-10 place-items-center rounded-md gradient-primary text-primary-foreground"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="roles" className="bg-secondary/50 py-20 border-y">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold tracking-tight">Built for every role</h2>
          <div className="mt-10 grid md:grid-cols-4 gap-5">
            {[
              ["Admin","Manage users, vendors, permissions, see all analytics."],
              ["Procurement Officer","Create RFQs, compare quotations, issue POs and invoices."],
              ["Manager","Approve or reject quotations with full audit trail."],
              ["Vendor","View RFQs, submit and revise quotations, track POs."],
            ].map(([r,d]) => (
              <Card key={r} className="p-6"><div className="font-semibold">{r}</div><p className="text-sm text-muted-foreground mt-1">{d}</p></Card>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-2xl gradient-hero p-10 md:p-14 text-primary-foreground shadow-elegant">
          <Sparkles className="h-8 w-8" />
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">AI that actually understands procurement.</h2>
          <p className="mt-3 max-w-2xl text-primary-foreground/85">Vendor recommendation, risk scoring, fraud signals, predictive spend and a chat assistant that knows your data.</p>
          <div className="mt-8"><Link to="/auth"><Button size="lg" className="bg-white text-primary hover:bg-white/90">Try it free</Button></Link></div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} VendorBridge.</footer>
    </div>
  );
}
