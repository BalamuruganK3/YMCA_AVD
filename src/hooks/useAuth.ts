import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "staff";

export function useAuth() {
  const query = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { user: null, role: null as Role | null, name: "" };
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const role: Role = roles?.some((r) => r.role === "admin") ? "admin" : "staff";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      return { user, role, name: profile?.full_name ?? user.email ?? "" };
    },
  });

  return {
    user: query.data?.user ?? null,
    role: query.data?.role ?? null,
    name: query.data?.name ?? "",
    isAdmin: query.data?.role === "admin",
    loading: query.isLoading,
  };
}
