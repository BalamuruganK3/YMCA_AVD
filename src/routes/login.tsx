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

export const Route = createFileRoute("/login")({
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
      if (data.session) navigate({ to: "/" });
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
      toast.error(
        `This account is not registered as ${selectedRole === "admin" ? "an Admin" : "Staff"}.`,
      );
      await supabase.auth.signOut();
      return;
    }

    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4 p-3 bg-white rounded-2xl shadow-sm border border-border/50">
            <div className="flex items-center gap-2">
              <img src={ymcaLogo} alt="YMCA logo" className="h-14 sm:h-16 w-auto object-contain" />
              <div className="text-left font-display font-bold text-sm sm:text-base leading-tight text-gray-900 uppercase">
                YMCA
                <br />
                Boys Town
              </div>
            </div>
            <div className="h-12 w-px bg-border/80" />
            <img
              src={avDynamicsLogo}
              alt="AV DYNAMICS logo"
              className="h-14 sm:h-16 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display uppercase tracking-wide text-foreground">
              Staff Portal Login
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in with your staff account to update room task progress, post remarks, and upload site photos.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Staff Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@company.com"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Password</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn("staff")}
              placeholder="••••••••"
            />
          </div>
          <Button className="w-full font-semibold" onClick={() => signIn("staff")} disabled={busy}>
            {busy ? "Signing in…" : "Sign In to Staff View"}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Return to Admin Dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
