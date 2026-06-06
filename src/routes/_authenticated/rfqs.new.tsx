import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rfqs/new")({
  head: () => ({ meta: [{ title: "New RFQ — VendorBridge" }] }),
  component: NewRfq,
});

const schema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  product_details: z.string().max(2000).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1),
  budget: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  deadline: z.string().min(1),
  vendor_ids: z.array(z.string()).min(1, "Invite at least one vendor"),
});

function NewRfq() {
  const nav = useNavigate(); const qc = useQueryClient(); const { user } = useAuth();
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-active"],
    queryFn: async () => (await supabase.from("vendors").select("id,company_name,category,user_id").eq("status", "active")).data ?? [],
  });
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { vendor_ids: [], quantity: 1 } as any,
  });
  const selected = watch("vendor_ids") ?? [];
  const toggle = (id: string) => setValue("vendor_ids", selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">New RFQ</h1><p className="text-muted-foreground">Define what you need and invite vendors.</p></div>
      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
          const { data: rfq, error } = await supabase.from("rfqs").insert({
            title: v.title, description: v.description || null, product_details: v.product_details || null,
            quantity: v.quantity, budget: v.budget === "" || v.budget == null ? null : Number(v.budget),
            deadline: new Date(v.deadline).toISOString(), status: "open", created_by: user!.id,
          }).select().single();
          if (error || !rfq) return toast.error(error?.message ?? "Failed");
          await supabase.from("rfq_vendors").insert(v.vendor_ids.map((vid) => ({ rfq_id: rfq.id, vendor_id: vid })));
          const vRows = (vendors as any[]).filter((x) => v.vendor_ids.includes(x.id) && x.user_id);
          if (vRows.length) await supabase.from("notifications").insert(vRows.map((x) => ({
            user_id: x.user_id, title: "New RFQ invitation", body: `${rfq.title} (${rfq.rfq_number})`, link: `/rfqs/${rfq.id}`,
          })));
          await supabase.from("activity_logs").insert({ user_id: user!.id, entity: "rfq", entity_id: rfq.id, message: `Created ${rfq.rfq_number}` });
          toast.success("RFQ created");
          qc.invalidateQueries({ queryKey: ["rfqs"] });
          nav({ to: "/rfqs/$id", params: { id: rfq.id } });
        })}>
          <div><Label>Title</Label><Input {...register("title")} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Quantity</Label><Input type="number" min={1} {...register("quantity")} /></div>
            <div><Label>Budget (₹)</Label><Input type="number" min={0} {...register("budget")} /></div>
            <div><Label>Deadline</Label><Input type="datetime-local" {...register("deadline")} />{errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}</div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} {...register("description")} /></div>
          <div><Label>Product details</Label><Textarea rows={3} {...register("product_details")} placeholder="Specs, drawings, compliance, etc." /></div>
          <div>
            <Label>Invite vendors</Label>
            <div className="border rounded-md p-3 max-h-56 overflow-y-auto mt-1 space-y-1.5">
              {vendors.length === 0 && <p className="text-sm text-muted-foreground">No active vendors. Add some first.</p>}
              {(vendors as any[]).map((vd) => (
                <label key={vd.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-accent/30 rounded p-1.5">
                  <input type="checkbox" checked={selected.includes(vd.id)} onChange={() => toggle(vd.id)} />
                  <span className="font-medium">{vd.company_name}</span>
                  <Badge variant="secondary" className="ml-auto capitalize">{vd.category}</Badge>
                </label>
              ))}
            </div>
            {errors.vendor_ids && <p className="text-xs text-destructive mt-1">{errors.vendor_ids.message as string}</p>}
          </div>
          <div className="flex justify-end gap-2"><Link to="/rfqs"><Button variant="outline" type="button">Cancel</Button></Link><Button type="submit" disabled={isSubmitting}>Create RFQ</Button></div>
        </form>
      </Card>
    </div>
  );
}
