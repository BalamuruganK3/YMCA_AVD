import { useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAreaOverallProgress,
  getCircularColor,
  getRoomProgress,
  AreaSlug,
} from "@/lib/constants";
import { roomCountLabel, renameAreaInPlace, upsertAreaSetting, type AreaSettingRow } from "@/lib/area-catalog";
import { assertPhotoSize, convertImageToWebp, uploadAreaImageWebp } from "@/lib/photo-upload";
import { CircularProgress } from "@/components/CircularProgress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

type RoomRow = {
  id: string;
  area: string;
  name: string;
  work_items?: { id: string; title?: string; status: string; remarks?: string | null }[] | null;
};

export function AreaRoomsSection({
  area,
  areaRooms,
  isStaff,
  settings,
}: {
  area: { slug: string; label: string; image: string; sourceArea: string | null };
  areaRooms: RoomRow[];
  isStaff: boolean;
  settings: AreaSettingRow[];
}) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(area.label);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const usePager = areaRooms.length > 5;
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(areaRooms.length / pageSize));
  const visibleRooms = usePager
    ? areaRooms.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
    : areaRooms;
  const overallAreaPct = getAreaOverallProgress(area.slug as AreaSlug, areaRooms);
  const nextBatchCount = Math.min(pageSize, areaRooms.length - (pageIndex + 1) * pageSize);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["area-settings"] });
    queryClient.invalidateQueries({ queryKey: ["custom-areas"] });
  };

  const saveLabel = useMutation({
    mutationFn: async () => renameAreaInPlace({
      fromSlug: area.slug,
      newLabel: labelDraft,
      rooms: areaRooms,
      settings,
    }),
    onSuccess: (res) => {
      refresh();
      setEditingLabel(false);
      toast.success(res.merged ? `Merged into existing ${res.label}. Data stayed on the same rooms.` : `Room type saved as ${res.label}.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      assertPhotoSize(file);
      const webp = await convertImageToWebp(file);
      const url = await uploadAreaImageWebp(area.slug, file.name, webp);
      await upsertAreaSetting({
        area: area.slug,
        label: area.label,
        image_url: url,
        source_area: area.sourceArea,
      });
    },
    onSuccess: () => {
      refresh();
      toast.success("Room type image updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setPendingImage(file);
  };

  const imageInputId = `area-image-${area.slug}`;

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
        <div className="relative">
          <Link
            to="/area/$area"
            params={{ area: area.slug }}
            search={{ room: areaRooms[0]?.id ?? "" }}
            className="group relative flex h-28 items-end overflow-hidden rounded-xl border border-border bg-primary/5"
          >
            {area.image ? (
              <img
                src={area.image}
                alt={`${area.label} interior`}
                loading="lazy"
                width={1024}
                height={640}
                className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-75"
              />
            ) : null}
            <span className="relative z-10 w-full bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 font-display text-2xl uppercase font-semibold">
              {area.label}
            </span>
          </Link>
          {isStaff && (
            <label
              htmlFor={imageInputId}
              className="absolute right-2 top-2 z-20 inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/20 bg-black/55 px-2 py-1 text-[11px] font-semibold text-white hover:bg-black/75"
            >
              <Camera className="h-3.5 w-3.5" />
              {area.image ? "Update image" : "Add image"}
            </label>
          )}
          <input id={imageInputId} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CircularProgress value={overallAreaPct} size={46} strokeWidth={5} />
              <div className="min-w-0">
                {isStaff && editingLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      className="h-8 max-w-[14rem] text-sm uppercase"
                    />
                    <Button size="sm" className="h-8" onClick={() => saveLabel.mutate()} disabled={saveLabel.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingLabel(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold uppercase text-foreground truncate">{area.label}</div>
                    {isStaff && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit room type name"
                        onClick={() => {
                          setLabelDraft(area.label);
                          setEditingLabel(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">{roomCountLabel(areaRooms.length)}</div>
              </div>
            </div>
            {usePager && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPageIndex(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${pageIndex === i ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/50"}`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 py-1">
            {usePager && pageIndex > 0 && (
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                className="flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 border-border/80 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground shadow-xs group"
              >
                <div className="flex items-center gap-1 font-display text-lg font-bold text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  1–{pageIndex * pageSize}
                </span>
              </button>
            )}

            {visibleRooms.map((room) => {
              const pct = getRoomProgress(room, area.slug as AreaSlug);
              const colorInfo = getCircularColor(pct);
              return (
                <Link
                  key={room.id}
                  to="/area/$area"
                  params={{ area: area.slug }}
                  search={{ room: room.id }}
                  className={`flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent ${colorInfo.border} ${colorInfo.bg}`}
                >
                  <span className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}>{pct}%</span>
                  <span className="mt-1 text-[11px] font-medium text-foreground whitespace-nowrap">{room.name}</span>
                </Link>
              );
            })}

            {usePager && pageIndex < totalPages - 1 && (
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                className="flex min-w-[7rem] flex-col items-center justify-center rounded-xl border-2 border-primary/50 bg-primary/10 hover:bg-primary/20 px-4 py-3 transition hover:scale-105 cursor-pointer text-primary shadow-xs group"
              >
                <div className="flex items-center gap-1 font-display text-lg font-bold text-primary">
                  <span>Next {nextBatchCount}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-primary/80 whitespace-nowrap">
                  {(pageIndex + 1) * pageSize + 1}–{Math.min((pageIndex + 2) * pageSize, areaRooms.length)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingImage} onOpenChange={(o) => !o && setPendingImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update room type image?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingImage?.name}” will be saved as WebP for {area.label}. Any format under 10 MB is accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingImage) {
                  uploadImage.mutate(pendingImage);
                  setPendingImage(null);
                }
              }}
            >
              Yes, update image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
