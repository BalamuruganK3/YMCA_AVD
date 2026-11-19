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

export function IssueDock({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "nav";
}) {
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
        {variant === "nav" ? (
          <button
            type="button"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold text-zinc-600 transition-all duration-200 hover:bg-white/60 hover:text-zinc-950 cursor-pointer ${className ?? ""}`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-zinc-600" />
            <span className="hidden sm:inline">Issues</span>
            <span
              className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                total > 0
                  ? "bg-red-600 text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {total}
            </span>
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 rounded-full border-white/90 bg-[#f0f3f6] font-bold text-zinc-800 shadow-neo-sm transition-transform hover:scale-[1.02] hover:bg-white cursor-pointer ${className ?? ""}`}
          >
            <AlertTriangle
              className={`h-4 w-4 ${total > 0 ? "animate-pulse text-zinc-950" : "text-zinc-500"}`}
            />
            <span>
              Issues{" "}
              <span className={total > 0 ? "text-red-600" : undefined}>({total})</span>
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto bg-[#f0f3f6] border border-white/90 shadow-none text-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-zinc-950 font-bold text-lg">Open issues</DialogTitle>
        </DialogHeader>

        {roomRemarks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Site & Room Blockers ({roomRemarks.length})
            </h4>
            {roomRemarks.map((room) => (
              <li
                key={room.id}
                className="list-none rounded-xl border border-white/90 bg-white/70 p-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-900">{areaLabel(room.area)}</span>
                  <button
                    type="button"
                    onClick={() => openPlace(room.area, room.id, "remarks")}
                    className="text-xs font-bold text-zinc-950 underline-offset-2 hover:underline cursor-pointer"
                  >
                    Open room
                  </button>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{room.remarks}</p>
              </li>
            ))}
          </div>
        )}

        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-2">
          Task issues ({items.length})
        </h4>
        <ul className="space-y-3">
          {items.map((issue) => {
            const room = issueRoom(issue.rooms);
            return (
            <li
              key={issue.id}
              className="rounded-xl border border-white/90 bg-white/70 p-3 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-zinc-900">{issue.title}</span>
                  {issue.group_name ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {issue.group_name}
                    </p>
                  ) : null}
                </div>
                {room && (
                  <button
                    type="button"
                    onClick={() => openPlace(room.area, room.id, issue.id)}
                    className="shrink-0 text-xs font-bold text-zinc-950 underline-offset-2 hover:underline cursor-pointer"
                  >
                    {areaLabel(room.area)} · {room.name}
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {issue.remarks?.trim() || "No remarks added."}
              </p>
            </li>
            );
          })}
          {items.length === 0 && (
            <li className="text-sm text-zinc-500 font-medium">No task-level issues.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
