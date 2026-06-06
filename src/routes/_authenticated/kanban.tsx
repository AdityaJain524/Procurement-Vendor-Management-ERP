import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({ meta: [{ title: "Procurement Kanban — VendorBridge" }] }),
  component: KanbanPage,
});

const columns = [
  { id: "draft", title: "RFQ Created" },
  { id: "open", title: "Awaiting Quotes" },
  { id: "under_review", title: "Approval Pending" },
  { id: "approved", title: "PO Generated" },
  { id: "completed", title: "Completed" },
] as const;

function KanbanPage() {
  const qc = useQueryClient();
  const { data: rfqs = [] } = useQuery({
    queryKey: ["rfqs-kanban"],
    queryFn: async () => (await supabase.from("rfqs").select("id,title,rfq_number,status,budget,deadline").order("created_at", { ascending: false })).data ?? [],
  });

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const r of rfqs as any[]) {
      const k = (r.status === "submitted" ? "open" : r.status === "rejected" ? "draft" : r.status) as string;
      if (map[k]) map[k].push(r);
    }
    return map;
  }, [rfqs]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id); const target = String(e.over.id);
    const { error } = await supabase.from("rfqs").update({ status: target as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved");
    qc.invalidateQueries({ queryKey: ["rfqs-kanban"] });
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Procurement Kanban</h1><p className="text-muted-foreground">Drag RFQs to update stage.</p></div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4 min-h-[60vh]">
          {columns.map((c) => <Column key={c.id} id={c.id} title={c.title} items={grouped[c.id] ?? []} />)}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ id, title, items }: { id: string; title: string; items: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-lg bg-secondary/50 p-3 transition-colors ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between mb-3 px-1"><h3 className="text-sm font-semibold">{title}</h3><Badge variant="outline">{items.length}</Badge></div>
      <div className="space-y-2">{items.map((it) => <CardItem key={it.id} item={it} />)}{items.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">empty</div>}</div>
    </div>
  );
}

function CardItem({ item }: { item: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`bg-card border rounded-md p-3 cursor-grab active:cursor-grabbing shadow-card ${isDragging ? "opacity-60" : ""}`}>
      <Link to="/rfqs/$id" params={{ id: item.id }} className="block">
        <div className="text-sm font-medium line-clamp-2">{item.title}</div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">{item.rfq_number}</div>
      </Link>
    </div>
  );
}
