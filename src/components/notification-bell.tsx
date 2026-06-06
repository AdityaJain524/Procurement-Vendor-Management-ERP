import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";

type N = { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (mounted) setItems((data ?? []) as N[]); });
    const ch = supabase.channel("notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => setItems((cur) => [p.new as N, ...cur].slice(0, 20)))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const markRead = async (id?: string) => {
    if (id) await supabase.from("notifications").update({ read: true }).eq("id", id);
    else if (user) await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((c) => c.map((n) => (!id || n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" />
          {unread > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center z-10">{unread}</span>
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive animate-ping opacity-75" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium text-sm">Notifications</div>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => markRead()}>Mark all read</Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
          {items.map((n) => (
            <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left px-3 py-3 hover:bg-accent border-b last:border-0 flex items-start gap-2">
              <div className={`mt-1.5 h-2 w-2 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{fmtDateTime(n.created_at)}</div>
              </div>
              {!n.read && <Badge variant="secondary" className="text-[10px]">new</Badge>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
