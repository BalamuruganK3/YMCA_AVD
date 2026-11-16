import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaLabel } from "@/lib/constants";
import { fetchOverallRoomRemarksList, isOverallRemarksItem } from "@/lib/room-remarks";
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
      const [itemRes, roomRemarks] = await Promise.all([
        supabase
          .from("work_items")
          .select("id, title, group_name, remarks, updated_at, rooms(id, name, area)")
          .eq("status", "issue")
          .order("updated_at", { ascending: false }),
        fetchOverallRoomRemarksList(),
      ]);
      if (itemRes.error) throw itemRes.error;
      return {
        items: (itemRes.data ?? []).filter((i) => !isOverallRemarksItem(i)),
        roomRemarks,
      };
    },
    refetchInterval: 30_000,
  });
}

function issueRoom(rooms: unknown): { id: string; name: string; area: string } | null {
  const room = Array.isArray(rooms) ? rooms[0] : rooms;
  if (!room || typeof room !== "object") return null;
  const row = room as { id?: string; name?: string; area?: string };
  if (!row.id || !row.area) return null;
  return { id: row.id, name: row.name ?? "", area: row.area };
}

export function IssueDock({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const openPlace = (area: string, roomId: string, itemId?: string) => {
    setOpen(false);
    window.setTimeout(() => {
      navigate({
        to: "/area/$area",
        params: { area },
        search: itemId ? { room: roomId, item: itemId } : { room: roomId },
      });
    }, 0);
  };
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
          <DialogTitle>Open issues</DialogTitle>
        </DialogHeader>

        {roomRemarks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ENTER THE ISSUES PREVENTING WORK COMPLETION IN THIS ROOM IN THE TEXT AREA BELOW.({roomRemarks.length})
            </h4>
            {roomRemarks.map((room) => (
              <li
                key={room.id}
                className="list-none rounded-lg border border-amber-400/40 bg-amber-500/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{areaLabel(room.area)}</span>
                  <button
                    type="button"
                    onClick={() => openPlace(room.area, room.id, "remarks")}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Open room
                  </button>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{room.remarks}</p>
              </li>
            ))}
          </div>
        )}

        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2">
          Task issues ({items.length})
        </h4>
        <ul className="space-y-3">
          {items.map((issue) => {
            const room = issueRoom(issue.rooms);
            return (
            <li
              key={issue.id}
              className="rounded-lg border border-status-issue/40 bg-status-issue/10 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{issue.title}</span>
                  {issue.group_name ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {issue.group_name}
                    </p>
                  ) : null}
                </div>
                {room && (
                  <button
                    type="button"
                    onClick={() => openPlace(room.area, room.id, issue.id)}
                    className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {areaLabel(room.area)} · {room.name}
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {issue.remarks?.trim() || "No remarks added."}
              </p>
            </li>
            );
          })}
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">No task-level issues.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
