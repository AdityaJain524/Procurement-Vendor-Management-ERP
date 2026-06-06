import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Plus, Search, Star, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/vendors")({
  head: () => ({ meta: [{ title: "Vendors — VendorBridge" }] }),
  component: VendorsPage,
});

const schema = z.object({
  company_name: z.string().min(2).max(120),
  contact_person: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional().or(z.literal("")),
  gst_number: z.string().max(20).regex(/^[0-9A-Z]{15}$/, "GST must be 15 chars (alphanumeric, uppercase)").optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  category: z.string().min(2).max(60),
  status: z.enum(["active", "inactive", "blacklisted"]),
});
type V = z.infer<typeof schema> & { id?: string; rating?: number; risk_score?: number };

function VendorsPage() {
  const qc = useQueryClient();
  const { user, isStaff, hasRole } = useAuth();
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<V | null>(null);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => (await supabase.from("vendors").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = (vendors as any[]).filter((v) =>
    (cat === "all" || v.category === cat) && (status === "all" || v.status === status) &&
    (!q || v.company_name.toLowerCase().includes(q.toLowerCase()) || (v.gst_number ?? "").includes(q.toUpperCase()))
  );
  const categories = Array.from(new Set((vendors as any[]).map((v) => v.category))).sort();

  const save = async (v: V) => {
    const payload = { ...v, gst_number: v.gst_number || null, created_by: user!.id };
    const { error } = editing?.id
      ? await supabase.from("vendors").update(payload).eq("id", editing.id)
      : await supabase.from("vendors").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Vendor updated" : "Vendor created");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["vendors"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete vendor?")) return;
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["vendors"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Onboard and govern your supplier network.</p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Add vendor</Button></DialogTrigger>
            <VendorDialog onSave={save} editing={editing} />
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search company name or GST…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="blacklisted">Blacklisted</SelectItem></SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>Category</TableHead><TableHead>GST</TableHead><TableHead>Rating</TableHead><TableHead>Risk</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">No vendors. Add your first vendor.</TableCell></TableRow>}
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell><div className="font-medium">{v.company_name}</div><div className="text-xs text-muted-foreground">{v.email}</div></TableCell>
                <TableCell><div className="text-sm">{v.contact_person}</div><div className="text-xs text-muted-foreground">{v.phone || "—"}</div></TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{v.category}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{v.gst_number || "—"}</TableCell>
                <TableCell><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{Number(v.rating).toFixed(1)}</span></TableCell>
                <TableCell>{Number(v.risk_score) > 60 ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{Number(v.risk_score).toFixed(0)}</Badge> : <Badge variant="outline">{Number(v.risk_score).toFixed(0)}</Badge>}</TableCell>
                <TableCell><Badge variant={v.status === "active" ? "default" : v.status === "blacklisted" ? "destructive" : "outline"} className="capitalize">{v.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {isStaff && <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Edit className="h-4 w-4" /></Button>}
                  {hasRole("admin") && <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function VendorDialog({ onSave, editing }: { onSave: (v: V) => void; editing: V | null }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: editing ?? { company_name: "", contact_person: "", email: "", phone: "", gst_number: "", address: "", category: "general", status: "active" },
  });
  const st = watch("status");
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit vendor" : "Add vendor"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit(onSave)} className="space-y-3">
        <div><Label>Company name</Label><Input {...register("company_name")} />{errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Contact person</Label><Input {...register("contact_person")} /></div>
          <div><Label>Email</Label><Input type="email" {...register("email")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input {...register("phone")} /></div>
          <div><Label>GST number</Label><Input {...register("gst_number")} placeholder="15-char GSTIN" />{errors.gst_number && <p className="text-xs text-destructive">{errors.gst_number.message}</p>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label><Input {...register("category")} placeholder="e.g. electronics" /></div>
          <div><Label>Status</Label>
            <Select value={st} onValueChange={(v) => setValue("status", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="blacklisted">Blacklisted</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Address</Label><Textarea rows={2} {...register("address")} /></div>
        <DialogFooter><Button type="submit">{editing ? "Save changes" : "Create vendor"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
