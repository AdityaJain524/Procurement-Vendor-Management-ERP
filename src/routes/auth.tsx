import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Boxes } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — VendorBridge" }, { name: "description", content: "Sign in or create your VendorBridge account." }] }),
  component: AuthPage,
});

const signInSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const signUpSchema = z.object({
  full_name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["admin", "procurement_officer", "manager", "vendor"]),
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-hero text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><Boxes className="h-5 w-5" /></div>
          <span className="font-bold text-lg">VendorBridge</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight max-w-md">The procurement command center your team deserves.</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">Vendors, RFQs, approvals, POs, invoices and AI insights — in one place.</p>
        </div>
        <div className="text-sm text-primary-foreground/60">© {new Date().getFullYear()} VendorBridge</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-elegant">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your VendorBridge workspace.</p>
          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
          </Tabs>
          <GoogleButton />
        </Card>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button" variant="outline" className="mt-4 w-full" disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
        if (res.error) { toast.error(res.error.message || "Google sign-in failed"); setBusy(false); }
      }}
    >Continue with Google</Button>
  );
}

function SignInForm() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });
  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit(async (v) => {
      const { error } = await supabase.auth.signInWithPassword(v);
      if (error) toast.error(error.message);
      else { toast.success("Welcome back"); nav({ to: "/dashboard" }); }
    })}>
      <div><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}</div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Password</Label>
          <button
            type="button"
            className="text-xs text-primary hover:underline cursor-pointer"
            onClick={async () => {
              const email = prompt("Enter your email address to receive a password reset link:");
              if (!email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/auth",
              });
              if (error) toast.error(error.message);
              else toast.success("Password reset email sent!");
            }}
          >
            Forgot password?
          </button>
        </div>
        <Input type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>Sign in</Button>
    </form>
  );
}

function SignUpForm() {
  const nav = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema), defaultValues: { role: "procurement_officer" as Role },
  });
  const role = watch("role");
  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit(async (v) => {
      const { error } = await supabase.auth.signUp({
        email: v.email, password: v.password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: v.full_name, role: v.role } },
      });
      if (error) toast.error(error.message);
      else { toast.success("Account created"); nav({ to: "/dashboard" }); }
    })}>
      <div><Label>Full name</Label><Input {...register("full_name")} />{errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}</div>
      <div><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}</div>
      <div><Label>Password</Label><Input type="password" {...register("password")} />{errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}</div>
      <div>
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setValue("role", v as Role)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="procurement_officer">Procurement Officer</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>Create account</Button>
    </form>
  );
}
