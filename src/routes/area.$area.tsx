import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ImagePlus,
  Images,
  X,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadWorkPhoto } from "@/lib/drive.functions";
import { saveWorkItemStatusClient } from "@/lib/save-work-item";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/useAuth";
import {
  areaLabel,
  getRoomProgress,
  statusesFor,
  STATUS_LABEL,
  statusTone,
  getItemDisplayStatus,
  getItemStatusTone,
  getEffectiveAreaRooms,
  AreaSlug,
  getItemWeight,
} from "@/lib/constants";
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

export const Route = createFileRoute("/area/$area")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search["room"] === "string" ? (search["room"] as string) : "",
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
  issue: "border-red-600 bg-red-600 text-white font-semibold hover:bg-red-700",
  hold: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  initiated: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

interface StatusPromptState {
  item: { id: string; title: string; kind: string; status: string; remarks: string | null };
  targetStatus: string;
}

function AreaPage() {
  const { area } = Route.useParams();
  const { room: roomParam } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const isViewer = !isStaff;
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

  // Fullscreen Lightbox Modal state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    id: string;
    file_name: string;
    drive_view_url?: string | null;
    drive_thumbnail_url?: string | null;
    created_at?: string;
  } | null>(null);

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
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
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
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_photos")
        .select("id, file_name, drive_view_url, drive_thumbnail_url, work_item_id, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  // Handle keyboard navigation for lightbox (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!lightboxPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (photos.length <= 1) return;
        const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
          setLightboxPhoto(photos[prevIndex] ?? null);
        }
      } else if (e.key === "ArrowRight") {
        if (photos.length <= 1) return;
        const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % photos.length;
          setLightboxPhoto(photos[nextIndex] ?? null);
        }
      } else if (e.key === "Escape") {
        setLightboxPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxPhoto, photos]);

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

  const saveStatus = useMutation({
    mutationFn: async (input: {
      id: string;
      status: string;
      remarks?: string | null;
      title?: string;
    }) => {
      if (!user) throw new Error("Please log in as staff to make updates.");

      const itemTitle = input.title || displayItems.find((i) => i.id === input.id)?.title || "";
      const currentArea = area as AreaSlug;
      const currentRoomName = roomName || rooms[0]?.name || "Room 1";

      const result = await saveWorkItemStatusClient({
        userId: user.id,
        area: currentArea,
        roomName: currentRoomName,
        itemId: input.id,
        itemTitle,
        status: input.status,
        remarks: input.remarks ?? null,
      });

      if (result?.roomId && (roomId.startsWith("virtual-") || roomId !== result.roomId)) {
        navigate({ to: "/area/$area", params: { area }, search: { room: result.roomId } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.refetchQueries({ queryKey: ["rooms-progress"] });
      queryClient.refetchQueries({ queryKey: ["work-items"] });
      toast.success("Work update saved successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openStatusPrompt = (
    item: { id: string; title: string; kind: string; status: string; remarks: string | null },
    targetStatus: string,
  ) => {
    const currentWeightPct = Math.round(getItemWeight(item) * 100);

    let defaultRange = currentWeightPct;
    if (targetStatus === "completed" || targetStatus === "installed") defaultRange = 100;
    else if (targetStatus === "supplied") defaultRange = 75;
    else if (targetStatus === "in_progress" || targetStatus === "received")
      defaultRange = currentWeightPct > 0 ? currentWeightPct : 50;
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
      toast.error(
        `Please provide remarks (quantity/supplier notes) for ${STATUS_LABEL[targetStatus]}.`,
      );
      return;
    }

    const formattedRemarks =
      targetStatus === "hold" || targetStatus === "issue"
        ? promptRemarks.trim()
        : `[Range: ${promptRange}%] ${promptRemarks.trim()}`.trim();

    saveStatus.mutate({
      id: item.id,
      status: targetStatus,
      remarks: formattedRemarks,
    });

    setPromptState(null);
  };

  // Helper to read and compress image client-side if needed (up to 10MB)
  const processImageFile = async (
    file: File,
  ): Promise<{ base64: string; dataUrl: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      // If already small (< 1MB), read directly
      if (file.size < 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result);
          const base64 = dataUrl.split(",")[1] ?? "";
          resolve({ base64, dataUrl, mimeType: file.type || "image/jpeg" });
        };
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
        return;
      }

      // For larger files up to 10MB, downscale to max 1920px dimensions to ensure fast & reliable upload
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1920;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to process image"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve({ base64, dataUrl, mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Invalid image format"));
      img.src = objectUrl;
    });
  };

  const onPickFile = async (file: File) => {
    if (!roomId) return;

    // Check maximum 10MB limit
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 10 MB limit. Please select a photo under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const { base64, dataUrl, mimeType } = await processImageFile(file);

      let dbWorkItemId = photoTarget;
      if (photoTarget && photoTarget.startsWith("virtual-") && roomId && !roomId.startsWith("virtual-")) {
        const selected = displayItems.find((i) => i.id === photoTarget);
        if (selected) {
          const { data: realItem } = await supabase
            .from("work_items")
            .select("id")
            .eq("room_id", roomId)
            .eq("title", selected.title)
            .maybeSingle();
          if (realItem) dbWorkItemId = realItem.id;
        }
      }

      try {
        await upload({
          data: {
            roomId,
            workItemId: dbWorkItemId,
            fileName: file.name,
            mimeType,
            dataBase64: base64,
            folderName: `${areaLabel(area)} ${roomName}`,
            area,
            roomName,
          },
        });
      } catch (uploadErr) {
        console.warn("Drive upload fallback to local storage:", uploadErr);
        // Fallback: direct insert to work_photos in Supabase
        if (user && roomId && !roomId.startsWith("virtual-")) {
          try {
            await supabase.from("work_photos").insert({
              room_id: roomId,
              work_item_id: dbWorkItemId && !dbWorkItemId.startsWith("virtual-") ? dbWorkItemId : null,
              file_name: file.name,
              drive_file_id: null,
              drive_view_url: dataUrl,
              drive_thumbnail_url: dataUrl,
              user_id: user.id,
            });
          } catch (photoErr) {
            console.warn("work_photos table error:", photoErr);
            toast.success("Photo processed");
            setUploading(false);
            setPhotoTarget(null);
            if (fileInput.current) fileInput.current.value = "";
            return;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["photos", roomId] });
      toast.success("Photo uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setPhotoTarget(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const { data: settings } = useSettings();
  const targetDeadline = settings?.deadline || "2026-04-15";
  const selected = displayItems.find((i) => i.id === selectedItem) ?? null;
  const pct = getRoomProgress({ name: roomName, work_items: displayItems }, area as AreaSlug);

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Higher Secondary School" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" /> Main dashboard
            </Link>
          </Button>
          <h1 className="text-3xl uppercase font-display font-semibold">{areaLabel(area)}</h1>
          {rooms.length > 1 ? (
            <Select
              value={roomId || "select"}
              onValueChange={(value) => {
                if (value && value !== "select") {
                  navigate({ to: "/area/$area", params: { area }, search: { room: value } });
                }
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select" disabled>
                  Select {areaLabel(area)}
                </SelectItem>
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
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Room Progress
            </span>
          </div>

          {targetDeadline && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 shadow-xs">
              <span className="font-display text-xl font-bold text-primary leading-none">
                {daysLeft(targetDeadline)}
              </span>
              <div className="text-[10px] uppercase font-bold text-primary/80 tracking-wider">
                {daysLeft(targetDeadline) === 1 ? "Day Left" : "Days Left"}
              </div>
            </div>
          )}

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:ml-auto justify-start sm:justify-end">
            <IssueDock />
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
                      <li
                        key={photo.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {photo.drive_thumbnail_url && (
                            <img
                              src={photo.drive_thumbnail_url}
                              alt=""
                              className="h-9 w-9 rounded object-cover cursor-pointer"
                              onClick={() => setLightboxPhoto(photo)}
                            />
                          )}
                          <span
                            className="truncate text-sm font-medium hover:text-primary cursor-pointer"
                            onClick={() => setLightboxPhoto(photo)}
                          >
                            {photo.file_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(photo)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium"
                          >
                            View
                          </button>
                          {photo.drive_view_url && (
                            <a
                              className="text-xs text-primary hover:underline"
                              href={photo.drive_view_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Drive
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DialogContent>
            </Dialog>
            {!isViewer && (
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
                <h2 className="text-xl uppercase text-primary font-display font-semibold">
                  {group}
                </h2>
                {groupItems.map((item) => {
                  const itemPhotos = photos.filter((p) => p.work_item_id === item.id);
                  const displayStatus = getItemDisplayStatus(item, isViewer);
                  const displayTone = getItemStatusTone(item, isViewer);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item.id);
                        setRemarks(item.remarks ?? "");
                      }}
                      className={`cursor-pointer rounded-lg border p-3 transition ${selectedItem === item.id
                        ? "border-primary shadow-xs bg-accent/20"
                        : "border-border hover:border-border/80"
                        }`}
                    >
                      {item.subgroup && (
                        <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-0.5">
                          {item.subgroup}
                        </div>
                      )}
                      <div className="font-medium text-foreground">{item.title}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {statusesFor(item.kind).map((status) => {
                          const active = item.status === status;
                          if (isViewer) {
                            return active ? (
                              <span
                                key={status}
                                className={`rounded-md border px-3 py-1 text-sm font-semibold ${toneClass[displayTone] || toneClass[statusTone(status)]}`}
                              >
                                {displayStatus}
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
                              className={`rounded-md border px-3 py-1 text-sm transition hover:border-primary ${active
                                ? toneClass[statusTone(status)]
                                : "border-border text-muted-foreground"
                                }`}
                            >
                              {STATUS_LABEL[status]}
                            </button>
                          );
                        })}
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoTarget(item.id);
                              fileInput.current?.click();
                            }}
                            className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
                            title="Add photo for this task"
                          >
                            + Photo
                          </button>
                        )}
                        {/* Display Uploaded Task Photos Inline */}
                        {itemPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxPhoto(photo);
                            }}
                            className="group/photo relative h-8 w-8 overflow-hidden rounded border border-border bg-surface transition hover:scale-105 hover:border-primary cursor-pointer shadow-xs"
                            title={`Click to view ${photo.file_name}`}
                          >
                            <img
                              src={photo.drive_thumbnail_url || photo.drive_view_url || ""}
                              alt={photo.file_name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition">
                              <Eye className="h-3 w-3 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {item.remarks && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground bg-muted/20 rounded p-1.5">
                          Remarks: {item.remarks}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {!isViewer && (
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
                    {groupItems.map((item) => {
                      const displayStatus = getItemDisplayStatus(item, isViewer);
                      const displayTone = getItemStatusTone(item, isViewer);
                      const itemPhotos = photos.filter((p) => p.work_item_id === item.id);

                      return (
                        <li key={item.id} className="text-foreground/90 pl-1">
                          <div className="font-medium inline">{item.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${toneClass[displayTone] || toneClass[statusTone(statusTone(item.status))]} border-status-progress bg-status-progress/15 text-status-progress`}
                            >
                              {displayStatus}
                            </span>
                            {itemPhotos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setLightboxPhoto(itemPhotos[0] ?? null)}
                                className="text-[11px] text-primary hover:underline font-medium"
                              >
                                📷 {itemPhotos.length} photo{itemPhotos.length > 1 ? "s" : ""}
                              </button>
                            )}
                            {item.remarks && (
                              <span className="text-muted-foreground italic">— {item.remarks}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
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

      {/* Status Update & Range Slider Modal */}
      <Dialog open={!!promptState} onOpenChange={(open) => !open && setPromptState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>Update Task Status</span>
            </DialogTitle>
          </DialogHeader>

          {promptState && (
            <div className="space-y-4 py-2">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Task</span>
                <p className="font-semibold text-foreground text-base">{promptState.item.title}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Target Status:</span>
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${toneClass[statusTone(promptState.targetStatus)]}`}>
                  {STATUS_LABEL[promptState.targetStatus] || promptState.targetStatus}
                </span>
              </div>

              {/* Range Percentage Slider */}
              <div className="space-y-2 rounded-lg border border-border/80 bg-surface p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="progress-range" className="text-xs font-semibold uppercase text-muted-foreground">
                    Completion Range
                  </Label>
                  <span className="font-display text-lg font-bold text-primary">
                    {promptRange}%
                  </span>
                </div>
                <input
                  id="progress-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={promptRange}
                  onChange={(e) => setPromptRange(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0% (Not Started)</span>
                  <span>50% (In-Progress)</span>
                  <span>100% (Done)</span>
                </div>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <Label htmlFor="prompt-remarks" className="text-xs font-semibold uppercase text-muted-foreground">
                  Remarks / Notes {(promptState.targetStatus === "hold" || promptState.targetStatus === "issue") && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="prompt-remarks"
                  value={promptRemarks}
                  onChange={(e) => setPromptRemarks(e.target.value)}
                  placeholder={
                    promptState.targetStatus === "issue"
                      ? "Explain the issue in detail…"
                      : promptState.targetStatus === "hold"
                        ? "Specify reason for hold…"
                        : "Optional remarks, supplier notes, quantity…"
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPromptState(null)} disabled={saveStatus.isPending}>
              Cancel
            </Button>
            <Button onClick={handlePromptSave} disabled={saveStatus.isPending}>
              {saveStatus.isPending ? "Saving…" : "Save Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Photo Lightbox Modal with Faded/Blurred Background */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Previous/Left Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
                if (currentIndex !== -1) {
                  const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
                  setLightboxPhoto(photos[prevIndex] ?? null);
                }
              }}
              className="absolute left-2 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-55 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-white/20 text-white transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Previous Image (Left Arrow)"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          {/* Next/Right Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
                if (currentIndex !== -1) {
                  const nextIndex = (currentIndex + 1) % photos.length;
                  setLightboxPhoto(photos[nextIndex] ?? null);
                }
              }}
              className="absolute right-2 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-55 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-white/20 text-white transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Next Image (Right Arrow)"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          <div
            className="relative max-w-4xl w-full flex flex-col items-center bg-card/95 border border-border rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close & Details Header */}
            <div className="w-full flex items-center justify-between gap-4 pb-3 border-b border-border/60">
              <div className="truncate">
                <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                  {lightboxPhoto.file_name}
                </h3>
                {lightboxPhoto.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded on {new Date(lightboxPhoto.created_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {lightboxPhoto.drive_view_url && (
                  <a
                    href={lightboxPhoto.drive_view_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="rounded-full p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Close (ESC)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* High-Resolution Image Preview */}
            <div className="w-full flex items-center justify-center py-4 max-h-[70vh] overflow-hidden">
              <img
                src={lightboxPhoto.drive_view_url || lightboxPhoto.drive_thumbnail_url || ""}
                alt={lightboxPhoto.file_name}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}
