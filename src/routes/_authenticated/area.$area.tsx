import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ImagePlus, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadWorkPhoto } from "@/lib/drive.functions";
import { saveWorkItemStatusServerFn } from "@/lib/sync.functions";
import { AppHeader } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { useAuth } from "@/hooks/useAuth";
import { areaLabel, progressOf, statusesFor, STATUS_LABEL, statusTone, getEffectiveAreaRooms, AreaSlug, getItemWeight } from "@/lib/constants";
import { getRoomDefaultWorkItems } from "@/lib/room-tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularProgress } from "@/components/CircularProgress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/area/$area")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search['room'] === "string" ? (search['room'] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Room Works — AV DYNAMICS PRIVATE LIMITED" },
      {
        name: "description",
        content:
          "Room-by-room work status, task details, staff remarks and site photos for the facility fit-out.",
      },
      { property: "og:title", content: "Room Works — AV DYNAMICS PRIVATE LIMITED" },
      {
        property: "og:description",
        content: "Room-by-room work status, remarks and site photos.",
      },
    ],
  }),
  component: AreaPage,
});

const toneClass: Record<string, string> = {
  done: "border-status-done bg-status-done/15 text-status-done",
  progress: "border-status-progress bg-status-progress/15 text-status-progress",
  issue: "border-status-issue bg-status-issue/15 text-status-issue",
  hold: "border-border bg-muted/40 text-muted-foreground",
};

interface StatusPromptState {
  item: { id: string; title: string; kind: string; status: string; remarks: string | null };
  targetStatus: string;
}

function AreaPage() {
  const { area } = Route.useParams();
  const { room: roomParam } = Route.useSearch();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = useServerFn(uploadWorkPhoto);

  // Modal dialog state for status updates & range fixing
  const [promptState, setPromptState] = useState<StatusPromptState | null>(null);
  const [promptRange, setPromptRange] = useState<number>(50);
  const [promptRemarks, setPromptRemarks] = useState<string>("");

  const { data: rawRooms = [] } = useQuery({
    queryKey: ["rooms", area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, area, name")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rooms = getEffectiveAreaRooms(area as AreaSlug, rawRooms);

  const roomId = roomParam || rooms[0]?.id || "";
  const roomName = rooms.find((r) => r.id === roomId)?.name ?? "";

  const { data: items = [] } = useQuery({
    queryKey: ["work-items", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("id, group_name, subgroup, title, kind, status, remarks, updated_at")
        .eq("room_id", roomId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_photos")
        .select("id, file_name, drive_view_url, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const displayItems = useMemo(() => {
    if (items.length > 0) return items;
    // Fallback if DB sync is in progress or room is virtual
    const defaults = getRoomDefaultWorkItems(area as AreaSlug, roomName);
    return defaults.map((d, i) => ({
      id: `virtual-item-${i}`,
      group_name: d.group_name,
      subgroup: d.subgroup,
      title: d.title,
      kind: d.kind,
      status: "hold",
      remarks: null,
      updated_at: new Date().toISOString(),
    }));
  }, [items, area, roomName]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof displayItems>();
    for (const item of displayItems) {
      const list = map.get(item.group_name) ?? [];
      list.push(item);
      map.set(item.group_name, list);
    }
    return [...map.entries()];
  }, [displayItems]);

  const ensureRealRoomId = async (areaSlug: AreaSlug, name: string): Promise<string> => {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("area", areaSlug)
      .eq("name", name)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from("rooms")
      .insert({ area: areaSlug, name, sort_order: 1 })
      .select("id")
      .single();

    if (error || !created) throw error || new Error("Failed to create room in database");

    const defaultItems = getRoomDefaultWorkItems(areaSlug, name).map((item) => ({
      ...item,
      room_id: created.id,
    }));

    await supabase.from("work_items").insert(defaultItems);
    return created.id;
  };

  const saveStatusServer = useServerFn(saveWorkItemStatusServerFn);

  const saveStatus = useMutation({
    mutationFn: async (input: { id: string; status: string; remarks?: string | null; title?: string }) => {
      if (!user) throw new Error("Not signed in");

      const itemTitle = input.title || displayItems.find((i) => i.id === input.id)?.title || "";

      try {
        await saveStatusServer({
          data: {
            area,
            roomName: roomName || rooms[0]?.name || "Room 1",
            itemId: input.id,
            itemTitle,
            status: input.status,
            remarks: input.remarks,
          },
        });
      } catch (err) {
        console.warn("Server function fallback to direct Supabase:", err);
        let targetItemId = input.id;

        if (roomId.startsWith("virtual-") || targetItemId.startsWith("virtual-")) {
          const realRoomId = await ensureRealRoomId(area as AreaSlug, roomName);
          const { data: realItems } = await supabase
            .from("work_items")
            .select("id, title")
            .eq("room_id", realRoomId);

          const realMatch = realItems?.find((i) => i.title === itemTitle);
          if (realMatch) {
            targetItemId = realMatch.id;
          }
        }

        const patch = {
          status: input.status,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
          ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        };

        const { error } = await supabase.from("work_items").update(patch).eq("id", targetItemId);
        if (error) throw error;

        await supabase.from("work_updates").insert({
          work_item_id: targetItemId,
          status: input.status,
          remarks: input.remarks ?? null,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Update saved to database");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openStatusPrompt = (
    item: { id: string; title: string; kind: string; status: string; remarks: string | null },
    targetStatus: string
  ) => {
    const currentWeightPct = Math.round(getItemWeight(item) * 100);
    
    let defaultRange = currentWeightPct;
    if (targetStatus === "completed" || targetStatus === "installed") defaultRange = 100;
    else if (targetStatus === "supplied") defaultRange = 75;
    else if (targetStatus === "in_progress" || targetStatus === "received") defaultRange = currentWeightPct > 0 ? currentWeightPct : 50;
    else if (targetStatus === "ordered" || targetStatus === "issue") defaultRange = 25;
    else if (targetStatus === "hold") defaultRange = 0;

    // Clean existing remarks (stripping old [Range: X%])
    const cleanRemarks = (item.remarks ?? "").replace(/\[Range:\s*\d+%\]\s*/i, "").trim();

    setPromptState({ item, targetStatus });
    setPromptRange(defaultRange);
    setPromptRemarks(cleanRemarks);
  };

  const handlePromptSave = () => {
    if (!promptState) return;
    const { item, targetStatus } = promptState;

    if ((targetStatus === "hold" || targetStatus === "issue") && !promptRemarks.trim()) {
      toast.error(`Please provide remarks/reason for marking ${STATUS_LABEL[targetStatus]}.`);
      return;
    }

    if ((targetStatus === "received" || targetStatus === "supplied") && !promptRemarks.trim()) {
      toast.error(`Please provide remarks (quantity/supplier notes) for ${STATUS_LABEL[targetStatus]}.`);
      return;
    }

    const formattedRemarks = `[Range: ${promptRange}%] ${promptRemarks.trim()}`.trim();

    saveStatus.mutate({
      id: item.id,
      status: targetStatus,
      remarks: formattedRemarks,
    });

    setPromptState(null);
  };

  const onPickFile = async (file: File) => {
    if (!roomId) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      await upload({
        data: {
          roomId,
          workItemId: photoTarget,
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          dataBase64: base64,
          folderName: `${areaLabel(area)} ${roomName}`,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["photos", roomId] });
      toast.success("Photo uploaded to Drive");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setPhotoTarget(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const selected = displayItems.find((i) => i.id === selectedItem) ?? null;
  const pct = progressOf(displayItems);

  return (
    <div className="min-h-screen">
      <AppHeader subtitle={isAdmin ? "Admin detail dashboard" : "Staff dashboard"} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Main dashboard
            </Link>
          </Button>
          <h1 className="text-3xl uppercase">{areaLabel(area)}</h1>
          {rooms.length > 1 ? (
            <Select
              value={roomId}
              onValueChange={(value) =>
                navigate({ to: "/area/$area", params: { area }, search: { room: value } })
              }
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={`${areaLabel(area)} select`} />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground">
              {roomName || rooms[0]?.name}
            </span>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5">
            <CircularProgress value={pct} size={42} strokeWidth={4} />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Room Progress</span>
          </div>

          <div className="ml-auto flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Images className="mr-1 h-4 w-4" /> Drive photos ({photos.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Photos uploaded for {roomName}</DialogTitle>
                </DialogHeader>
                {photos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {photos.map((photo) => (
                      <li key={photo.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
                        <span className="truncate text-sm">{photo.file_name}</span>
                        <a
                          className="shrink-0 text-xs text-primary hover:underline"
                          href={photo.drive_view_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Drive
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </DialogContent>
            </Dialog>
            {!isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setPhotoTarget(selectedItem);
                  fileInput.current?.click();
                }}
                disabled={uploading}
              >
                <ImagePlus className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Add photo"}
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="panel space-y-5 p-5">
            {grouped.map(([group, groupItems]) => (
              <div key={group} className="space-y-3">
                <h2 className="text-xl uppercase text-primary">{group}</h2>
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item.id);
                      setRemarks(item.remarks ?? "");
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      selectedItem === item.id ? "border-primary shadow-xs" : "border-border"
                    }`}
                  >
                    {item.subgroup && (
                      <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-0.5">
                        {item.subgroup}
                      </div>
                    )}
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {statusesFor(item.kind).map((status) => {
                        const active = item.status === status;
                        if (isAdmin) {
                          return active ? (
                            <span
                              key={status}
                              className={`rounded-md border px-3 py-1 text-sm ${toneClass[statusTone(status)]}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          ) : null;
                        }
                        return (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item.id);
                              openStatusPrompt(item, status);
                            }}
                            className={`rounded-md border px-3 py-1 text-sm transition hover:border-primary ${
                              active ? toneClass[statusTone(status)] : "border-border text-muted-foreground"
                            }`}
                          >
                            {STATUS_LABEL[status]}
                          </button>
                        );
                      })}
                      {!isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoTarget(item.id);
                            fileInput.current?.click();
                          }}
                          className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground hover:border-primary"
                        >
                          +
                        </button>
                      )}
                    </div>
                    {item.remarks && (
                      <p className="mt-2 text-sm text-muted-foreground">Remarks: {item.remarks}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {!isAdmin && (
              <div className="rounded-lg border border-border p-4">
                <label className="text-sm font-medium">
                  Remarks to issue{selected ? `: ${selected.title}` : ""}
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      selected ? "Describe the issue or note…" : "Select a task above first"
                    }
                    disabled={!selected}
                  />
                  <Button
                    className="sm:self-end"
                    disabled={!selected || saveStatus.isPending}
                    onClick={() =>
                      selected &&
                      saveStatus.mutate({
                        id: selected.id,
                        status: selected.status,
                        remarks: remarks.trim() || null,
                      })
                    }
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </section>

          <aside className="panel h-fit space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-xl uppercase font-display font-semibold">Tasks details</h2>
              <span className="text-xs font-semibold text-muted-foreground bg-surface px-2.5 py-1 rounded-md border border-border">
                {displayItems.length} Tasks
              </span>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {grouped.map(([group, groupItems], gIdx) => (
                <div key={group} className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">
                    {gIdx + 1}. {group}
                  </div>
                  <ol className="list-decimal space-y-2 pl-4 text-sm">
                    {groupItems.map((item) => (
                      <li key={item.id} className="text-foreground/90 pl-1">
                        <div className="font-medium inline">{item.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${toneClass[statusTone(item.status)]}`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                          {item.remarks && (
                            <span className="text-muted-foreground italic">
                              — {item.remarks}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              {displayItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Select a room to see tasks.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Interactive Status & Range Prompt Dialog */}
      <Dialog open={!!promptState} onOpenChange={(open) => !open && setPromptState(null)}>
        {promptState && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="uppercase text-lg font-display">
                Update Status: {STATUS_LABEL[promptState.targetStatus]}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-semibold text-foreground">
                  Task: {promptState.item.title}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {promptState.targetStatus === "hold" || promptState.targetStatus === "issue"
                    ? "Provide mandatory remarks explaining why this item is on hold or has an issue."
                    : promptState.targetStatus === "received" || promptState.targetStatus === "supplied"
                    ? "Provide mandatory remarks (e.g. quantity received/supplied, supplier notes)."
                    : "Fix completion range percentage and add optional remarks."}
                </p>
              </div>

              {/* Range Selector */}
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase">Completion Range (%)</Label>
                  <span className="font-display font-bold text-primary text-base">
                    {promptRange}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={promptRange}
                    onChange={(e) => setPromptRange(Number(e.target.value))}
                    className="cursor-pointer h-2 accent-primary"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={promptRange}
                    onChange={(e) => setPromptRange(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-16 text-center text-xs h-8"
                  />
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[25, 50, 75, 90, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPromptRange(preset)}
                      className={`rounded px-2 py-0.5 text-xs font-medium border transition ${
                        promptRange === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-surface border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <Label htmlFor="status-remarks" className="text-xs font-semibold uppercase">
                  Remarks / Reason{" "}
                  {promptState.targetStatus === "hold" ||
                  promptState.targetStatus === "issue" ||
                  promptState.targetStatus === "received" ||
                  promptState.targetStatus === "supplied" ? (
                    <span className="text-destructive">* (Required)</span>
                  ) : (
                    <span className="text-muted-foreground">(Optional)</span>
                  )}
                </Label>
                <Textarea
                  id="status-remarks"
                  value={promptRemarks}
                  onChange={(e) => setPromptRemarks(e.target.value)}
                  placeholder={
                    promptState.targetStatus === "hold"
                      ? "Explain why this work/item is on hold…"
                      : promptState.targetStatus === "issue"
                      ? "Describe the issue or problem encountered…"
                      : promptState.targetStatus === "received" || promptState.targetStatus === "supplied"
                      ? "Enter quantity, supplier or delivery details…"
                      : "Enter optional task remarks…"
                  }
                  className="min-h-20 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPromptState(null)}>
                Cancel
              </Button>
              <Button onClick={handlePromptSave} disabled={saveStatus.isPending}>
                Save Update
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <IssueDock />
    </div>
  );
}
