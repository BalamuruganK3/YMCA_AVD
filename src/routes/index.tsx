import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import ymcaLogo from "@/assets/YMCA.jpeg";
import avDynamicsLogo from "@/assets/AV DYNAMICS PRIVATE LIMITED LOGO.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Role } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — AV DYNAMICS PRIVATE LIMITED" },
      {
        name: "description",
        content:
          "Sign in to track smart class, lab, staff room and facility fit-out progress, issues and site photos.",
      },
      { property: "og:title", content: "AV DYNAMICS PRIVATE LIMITED" },
      {
        property: "og:description",
        content: "Track room-by-room construction progress, issues and site photos.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (selectedRole: Role) => {
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    setBusy(false);

    if (roleError) {
      toast.error(roleError.message);
      await supabase.auth.signOut();
      return;
    }

    const hasSelectedRole = roles?.some((r) => r.role === selectedRole);
    if (!hasSelectedRole) {
      toast.error(`This account is not registered as ${selectedRole === "admin" ? "an Admin" : "Staff"}.`);
      await supabase.auth.signOut();
      return;
    }

    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-border/50">
            <img
              src={ymcaLogo}
              alt="YMCA logo"
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <div className="h-12 w-px bg-border/80" />
            <img
              src={avDynamicsLogo}
              alt="AV DYNAMICS logo"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Smart class, lab, staff room and facility fit-out progress in one place.
          </p>
        </div>

        <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
            <TabsTrigger value="staff">Staff Login</TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="space-y-3 pt-4">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
            />
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className="w-full" onClick={() => signIn("admin")} disabled={busy}>
              Sign in as Admin
            </Button>
          </TabsContent>

          <TabsContent value="staff" className="space-y-3 pt-4">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@company.com"
            />
            <Label htmlFor="staff-password">Password</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className="w-full" onClick={() => signIn("staff")} disabled={busy}>
              Sign in as Staff
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
