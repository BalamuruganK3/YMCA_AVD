import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ymcaLogo from "@/assets/YMCA.jpeg";
import avDynamicsLogo from "@/assets/AV DYNAMICS PRIVATE LIMITED LOGO.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function daysLeft(deadline: string) {
  const end = new Date(deadline + "T00:00:00").getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function useSettings() {
  return useQuery({
    queryKey: ["project-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_settings")
        .select("deadline, project_name")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { name, role } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:py-2.5">
        {/* Left top: First Logo (YMCA) */}
        <Link to="/dashboard" className="flex items-center group">
          <img
            src={ymcaLogo}
            alt="YMCA logo"
            className="h-14 sm:h-16 md:h-18 w-auto object-contain rounded-lg transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Right top: User profile, Sign out & Second Logo (AV DYNAMICS) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">{name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {role}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
          <div className="h-8 w-px bg-border/60" />
          <Link to="/dashboard" className="flex items-center group">
            <img
              src={avDynamicsLogo}
              alt="AV DYNAMICS logo"
              className="h-14 sm:h-16 md:h-18 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
