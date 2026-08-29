import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, AreaSlug } from "@/lib/constants";
import { getRoomDefaultWorkItems } from "@/lib/room-tasks";
import {
  findExistingAreaSlug,
  formatAreaLabel,
  formatRoomName,
  nextRoomNames,
  toAreaSlug,
  upsertAreaSetting,
  type AreaSettingRow,
} from "@/lib/area-catalog";
import { assertPhotoSize, convertImageToWebp, uploadAreaImageWebp } from "@/lib/photo-upload";
import { toAllCaps, toTitleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WorkDraft = { heading: string; subheading: string; work: string; action: "work" | "material" };

export function NewRoomDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [areaType, setAreaType] = useState<AreaSlug>("classroom");
  const [roomName, setRoomName] = useState("");
  const [roomCount, setRoomCount] = useState(1);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const [customAreaPreset, setCustomAreaPreset] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [works, setWorks] = useState<WorkDraft[]>([
    { heading: "", subheading: "", work: "", action: "work" },
  ]);

  const builtinSlugs = new Set<string>(AREAS.map((a) => a.slug));
  const { data: roomAreas = [] } = useQuery({
    queryKey: ["custom-areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("area, name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: areaSettings = [] } = useQuery({
    queryKey: ["area-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("area_settings")
        .select("area, label, image_url, source_area");
      if (error) throw error;
      return (data ?? []) as AreaSettingRow[];
    },
  });

  const customAreas = Array.from(
    new Set(
      roomAreas
        .map((row) => row.area)
        .filter((area) => area && !builtinSlugs.has(area)),
    ),
  ).sort();

  const reset = () => {
    setAreaType("classroom");
    setRoomName("");
    setRoomCount(1);
    setIsCustomArea(false);
    setCustomArea("");
    setCustomAreaPreset(null);
    setImageFile(null);
    setWorks([{ heading: "", subheading: "", work: "", action: "work" }]);
    setConfirmOpen(false);
  };

  const updateWork = (idx: number, patch: Partial<WorkDraft>) => {
    setWorks((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  };

  const resolvedArea = () => {
    if (isCustomArea) {
      const label = formatAreaLabel(customArea);
      const existing = findExistingAreaSlug(label, roomAreas, areaSettings);
      return {
        slug: existing ?? toAreaSlug(label),
        label: existing
          ? areaSettings.find((s) => s.area === existing)?.label || formatAreaLabel(existing)
          : label,
        merged: Boolean(existing),
        source: AREAS.find((a) => a.slug === (existing ?? toAreaSlug(label)))?.slug ?? null,
      };
    }
    if (customAreaPreset) {
      return {
        slug: customAreaPreset,
        label: formatAreaLabel(customAreaPreset),
        merged: true,
        source: null,
      };
    }
    const area = AREAS.find((a) => a.slug === areaType);
    return { slug: areaType, label: area?.label ?? areaType, merged: true, source: areaType };
  };

  const createRoom = useMutation({
    mutationFn: async () => {
      const target = resolvedArea();
      if (!target.slug) throw new Error("Please choose or enter a room type.");
      const baseName = formatRoomName(roomName);
      if (!baseName) throw new Error("Please enter a room name (e.g. Staff Room).");
      const count = Math.max(1, Math.floor(roomCount) || 1);
      const existingNames = roomAreas.filter((r) => r.area === target.slug).map((r) => r.name);
      const names = nextRoomNames(baseName, count, existingNames);
      const validWorks = works.filter((w) => w.heading.trim() && w.subheading.trim() && w.work.trim());
      const useDefaults = validWorks.length === 0 && Boolean(AREAS.find((a) => a.slug === target.slug || a.slug === target.source));

      let imageUrl: string | undefined;
      if (imageFile) {
        assertPhotoSize(imageFile);
        const webp = await convertImageToWebp(imageFile);
        imageUrl = await uploadAreaImageWebp(target.slug, imageFile.name, webp);
      }

      await upsertAreaSetting({
        area: target.slug,
        label: target.label,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        source_area: target.source,
      });

      const created: string[] = [];
      for (const name of names) {
        const { data: room, error: roomErr } = await supabase
          .from("rooms")
          .insert({ area: target.slug, name, sort_order: 999 })
          .select("id")
          .single();
        if (roomErr) throw new Error(roomErr.message || "Failed to create room");

        if (useDefaults) {
          const seedSlug = (AREAS.find((a) => a.slug === target.slug)?.slug ?? target.source ?? "classroom") as AreaSlug;
          const defaults = getRoomDefaultWorkItems(seedSlug, name);
          if (defaults.length > 0) {
            const { error: itemsErr } = await supabase.from("work_items").insert(
              defaults.map((t) => ({
                room_id: room.id,
                group_name: t.group_name,
                subgroup: t.subgroup,
                title: t.title,
                kind: t.kind,
                sort_order: t.sort_order,
              })),
            );
            if (itemsErr) throw new Error(itemsErr.message || "Failed to save room tasks");
          }
        } else if (validWorks.length > 0) {
          const { error: itemsErr } = await supabase.from("work_items").insert(
            validWorks.map((w, idx) => ({
              room_id: room.id,
              group_name: toAllCaps(w.heading),
              subgroup: toTitleCase(w.subheading),
              title: toTitleCase(w.work),
              kind: w.action,
              status: "hold" as const,
              sort_order: idx + 1,
            })),
          );
          if (itemsErr) throw new Error(itemsErr.message || "Failed to save room tasks");
        }
        created.push(name);
      }
      return { names: created, merged: existingNames.length > 0 || target.merged, label: target.label };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["area-settings"] });
      queryClient.invalidateQueries({ queryKey: ["custom-areas"] });
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
      setOpen(false);
      reset();
      toast.success(
        res.merged
          ? `Added to existing ${res.label}: ${res.names.join(", ")}`
          : `Room type ${res.label} created: ${res.names.join(", ")}`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeArea = AREAS.find((a) => a.slug === areaType);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-w-[6.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-primary transition hover:scale-105 hover:bg-primary/15 cursor-pointer"
            title="Add a room type or more rooms"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[11px] font-semibold">Add room type</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Add room type or rooms</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Room Type</Label>
                <Select
                  value={isCustomArea ? "__others" : (customAreaPreset ?? areaType)}
                  onValueChange={(v) => {
                    if (v === "__others") {
                      setIsCustomArea(true);
                      setCustomAreaPreset(null);
                    } else if (builtinSlugs.has(v)) {
                      setIsCustomArea(false);
                      setCustomAreaPreset(null);
                      setAreaType(v as AreaSlug);
                    } else {
                      setIsCustomArea(false);
                      setCustomAreaPreset(v);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>
                        {a.label}
                      </SelectItem>
                    ))}
                    {customAreas.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {formatAreaLabel(slug)}
                      </SelectItem>
                    ))}
                    <SelectItem value="__others">Custom…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-room-count" className="text-xs font-semibold uppercase text-muted-foreground">
                  No. of Rooms
                </Label>
                <Input
                  id="new-room-count"
                  type="number"
                  min={1}
                  value={roomCount}
                  onChange={(e) => setRoomCount(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>

            {isCustomArea && (
              <div className="space-y-1.5">
                <Label htmlFor="new-area-name" className="text-xs font-semibold uppercase text-muted-foreground">
                  New or existing type name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-area-name"
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="e.g. High Class, Gym Hall"
                />
                <p className="text-xs text-muted-foreground">
                  If this name already exists, rooms are added to that type. Text is stored in the correct format.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-room-name" className="text-xs font-semibold uppercase text-muted-foreground">
                Room Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={`e.g. ${isCustomArea ? customArea || "High Class" : activeArea?.label}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-area-image" className="text-xs font-semibold uppercase text-muted-foreground">
                Room type image
              </Label>
              <Input
                id="new-area-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Any image format under 10 MB. Saved as WebP.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Works in the room <span className="font-normal normal-case">(optional)</span>
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setWorks((prev) => [...prev, { heading: "", subheading: "", work: "", action: "work" }])
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {works.map((w, idx) => (
                <div key={idx} className="space-y-1.5 rounded-lg border border-border p-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <Input
                      value={w.heading}
                      onChange={(e) => updateWork(idx, { heading: e.target.value })}
                      placeholder="Heading (e.g. Civil Work)"
                      className="h-8 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setWorks((prev) => prev.filter((_, i) => i !== idx))}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/60 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    value={w.subheading}
                    onChange={(e) => updateWork(idx, { subheading: e.target.value })}
                    placeholder="Sub heading"
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-[1fr_8rem] gap-1.5">
                    <Input
                      value={w.work}
                      onChange={(e) => updateWork(idx, { work: e.target.value })}
                      placeholder="Work / task"
                      className="h-8 text-xs"
                    />
                    <Select
                      value={w.action}
                      onValueChange={(v) => updateWork(idx, { action: v as "work" | "material" })}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createRoom.isPending}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={createRoom.isPending}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add these rooms?</AlertDialogTitle>
            <AlertDialogDescription>
              Room type “{resolvedArea().label}”, name “{formatRoomName(roomName) || "—"}”, count {Math.max(1, roomCount)}.
              Matching types or room names are added to the existing type instead of creating a duplicate table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(false);
                createRoom.mutate();
              }}
            >
              {createRoom.isPending ? "Saving…" : "Yes, add"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
