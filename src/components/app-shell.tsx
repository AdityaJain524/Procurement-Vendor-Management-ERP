import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Boxes, LayoutDashboard, Users2, ClipboardList, FileCheck2, Receipt, FileText,
  KanbanSquare, Trophy, BarChart3, ShieldCheck, Sparkles, ScrollText, LogOut, Moon, Sun, Briefcase,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";

type Item = { to: string; label: string; icon: any; roles?: ("admin" | "procurement_officer" | "manager" | "vendor")[] };

const items: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vendors", label: "Vendors", icon: Users2, roles: ["admin", "procurement_officer", "manager"] },
  { to: "/rfqs", label: "RFQs", icon: ClipboardList },
  { to: "/approvals", label: "Approvals", icon: FileCheck2, roles: ["admin", "manager", "procurement_officer"] },
  { to: "/purchase-orders", label: "Purchase Orders", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare, roles: ["admin", "procurement_officer", "manager"] },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["admin", "procurement_officer", "manager"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "procurement_officer", "manager"] },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/portal", label: "Vendor Portal", icon: Briefcase, roles: ["vendor"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, roles, hasRole, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visible = items.filter((i) => !i.roles || i.roles.some((r) => hasRole(r)));
  const primaryRole = roles[0] ?? "user";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Boxes className="h-5 w-5" /></div>
          <div><div className="font-bold text-base leading-none">VendorBridge</div><div className="text-[10px] text-sidebar-foreground/60 mt-1 uppercase tracking-wider">Procurement ERP</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visible.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <Link key={it.to} to={it.to}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/40">
            <Avatar className="h-9 w-9"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{initials(profile?.full_name || profile?.email)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{profile?.full_name || "User"}</div>
              <div className="text-[10px] text-sidebar-foreground/60 uppercase">{primaryRole.replace("_", " ")}</div>
            </div>
            <Button size="icon" variant="ghost" className="text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-6 h-14">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Workspace</span>
              <Badge variant="secondary">Live</Badge>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={toggle}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
