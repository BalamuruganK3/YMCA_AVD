import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaLabel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function useIssues() {
  return useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("id, title, group_name, remarks, updated_at, rooms(id, name, area)")
        .eq("status", "issue")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function IssueDock({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { data: issues = [] } = useIssues();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={issues.length > 0 ? "destructive" : "outline"}
          size="sm"
          className={`gap-1.5 font-semibold transition-transform hover:scale-105 shadow-xs ${className ?? ""}`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${issues.length > 0 ? "animate-pulse" : "text-muted-foreground"}`}
          />
          <span>Issues {issues.length > 0 ? `(${issues.length})` : "(0)"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open issues reported by staff</DialogTitle>
        </DialogHeader>
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="rounded-lg border border-status-issue/40 bg-status-issue/10 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{issue.title}</span>
                {issue.rooms && (
                  <Link
                    to="/area/$area"
                    params={{ area: issue.rooms.area }}
                    search={{ room: issue.rooms.id }}
                    onClick={() => setOpen(false)}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {areaLabel(issue.rooms.area)} · {issue.rooms.name}
                  </Link>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {issue.remarks?.trim() || "No remarks added."}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
