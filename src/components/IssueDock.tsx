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
      const [itemRes, roomRes] = await Promise.all([
        supabase
          .from("work_items")
          .select("id, title, group_name, remarks, updated_at, rooms(id, name, area)")
          .eq("status", "issue")
          .order("updated_at", { ascending: false }),
        supabase.from("rooms").select("id, name, area, remarks").not("remarks", "is", null),
      ]);
      if (itemRes.error) throw itemRes.error;
      if (roomRes.error) throw roomRes.error;
      return {
        items: itemRes.data ?? [],
        roomRemarks: roomRes.data ?? [],
      };
    },
    refetchInterval: 30_000,
  });
}

export function IssueDock({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useIssues();
  const items = data?.items ?? [];
  const roomRemarks = data?.roomRemarks ?? [];
  const total = items.length + roomRemarks.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={total > 0 ? "destructive" : "outline"}
          size="sm"
          className={`gap-1.5 font-semibold transition-transform hover:scale-105 shadow-xs ${className ?? ""}`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${total > 0 ? "animate-pulse" : "text-muted-foreground"}`}
          />
          <span>Issues {total > 0 ? `(${total})` : "(0)"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open issues & room remarks</DialogTitle>
        </DialogHeader>

        {roomRemarks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall room remarks ({roomRemarks.length})
            </h4>
            {roomRemarks.map((room) => (
              <li
                key={room.id}
                className="list-none rounded-lg border border-amber-400/40 bg-amber-500/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {areaLabel(room.area)} · {room.name}
                  </span>
                  <Link
                    to="/area/$area"
                    params={{ area: room.area }}
                    search={{ room: room.id }}
                    onClick={() => setOpen(false)}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Open room
                  </Link>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{room.remarks}</p>
              </li>
            ))}
          </div>
        )}

        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">
          Task issues ({items.length})
        </h4>
        <ul className="space-y-3">
          {items.map((issue) => (
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
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">No task-level issues.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
