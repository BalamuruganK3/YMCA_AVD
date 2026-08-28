import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    refetchInterval: 30_000,
  });
}

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { name, role, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    queryClient.setQueryData(["auth-session"], { user: null, role: null, name: "" });
    await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:py-2.5">
        {/* Left top: First Logo (YMCA) + School Name */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group">
          <img
            src={ymcaLogo}
            alt="YMCA logo"
            className="h-14 sm:h-16 md:h-18 w-auto object-contain rounded-lg transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display text-base sm:text-xl md:text-2xl font-bold uppercase tracking-tight text-foreground leading-tight group-hover:text-primary transition-colors">
              YMCA Boys Town
            </span>
            {subtitle && (
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium block">
                {subtitle}
              </span>
            )}
          </div>
        </Link>

        {/* Right top: Admin View status / Staff login / User profile & Second Logo (AV DYNAMICS) */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isStaff ? (
            <>
              <div className="text-right">
                <div className="text-sm font-medium leading-tight">{name || "Staff Member"}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Edit View
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Admin View
              </span>
              <Link to="/login">
                <Button size="sm" className="font-semibold cursor-pointer">
                  Staff Login
                </Button>
              </Link>
            </div>
          )}
          <div className="h-8 w-px bg-border/60" />
          <Link to="/" className="flex items-center group">
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
