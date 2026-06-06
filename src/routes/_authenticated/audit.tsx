import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Log — VendorBridge" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data: audit = [] } = useQuery({ queryKey: ["audit"], queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  const { data: activity = [] } = useQuery({ queryKey: ["activity"], queryFn: async () => (await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Audit & Activity</h1><p className="text-muted-foreground">Every action across the workspace.</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="p-4 border-b"><h3 className="font-semibold">Activity stream</h3></div>
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Entity</TableHead><TableHead>Message</TableHead></TableRow></TableHeader>
            <TableBody>
              {activity.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No activity.</TableCell></TableRow>}
              {(activity as any[]).map((a) => (
                <TableRow key={a.id}><TableCell className="text-xs">{fmtDateTime(a.created_at)}</TableCell><TableCell className="text-xs capitalize">{a.entity}</TableCell><TableCell className="text-sm">{a.message}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <div className="p-4 border-b"><h3 className="font-semibold">Audit log (admin)</h3></div>
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead></TableRow></TableHeader>
            <TableBody>
              {audit.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No audit records.</TableCell></TableRow>}
              {(audit as any[]).map((a) => (
                <TableRow key={a.id}><TableCell className="text-xs">{fmtDateTime(a.created_at)}</TableCell><TableCell className="text-sm">{a.action}</TableCell><TableCell className="text-xs capitalize">{a.entity}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
