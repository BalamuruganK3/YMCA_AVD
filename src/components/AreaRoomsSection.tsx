import { useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Camera,
  Eye,
  History,
  ImageIcon,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAreaOverallProgress,
  getRoomProgress,
  AreaSlug,
} from "@/lib/constants";
import { renameAreaInPlace, upsertAreaSetting, type AreaSettingRow } from "@/lib/area-catalog";
import { assertPhotoSize, convertImageToWebp, uploadAreaImageWebp } from "@/lib/photo-upload";
import { CircularProgress } from "@/components/CircularProgress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

type RoomRow = {
  id: string;
  area: string;
  name: string;
  work_items?: { id: string; title?: string; status: string; remarks?: string | null }[] | null;
};

/**
 * High-intensity Neomorphic card matching the reference UI.
 * Features:
 * 1. Top inset image well with photo / placeholder.
 * 2. "Recently updated" header with 3.5 circular progress bars visible.
 * 3. Circle progress: high-intensity grey back fill/space (#cbd5e1), pure black progress arc,
 *    grey inside center with bold black percentage. Clicking a circle only selects it and the
 *    selected circle gets a blue highlight ring.
 * 4. Minimal total progress ring placed inside the image at the bottom right.
 * 5. Minimal "View all" link on the left and a visible "Open" button on the right.
 */
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
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(area.label);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const selectedRoom = areaRooms.find((r) => r.id === selectedRoomId) ?? areaRooms[0];
  const overallAreaPct = getAreaOverallProgress(area.slug as AreaSlug, areaRooms);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["area-settings"] });
    queryClient.invalidateQueries({ queryKey: ["custom-areas"] });
  };

  const saveLabel = useMutation({
    mutationFn: async () =>
      renameAreaInPlace({
        fromSlug: area.slug,
        newLabel: labelDraft,
        rooms: areaRooms,
        settings,
      }),
    onSuccess: (res) => {
      refresh();
      setEditingLabel(false);
      toast.success(
        res.merged
          ? `Merged into existing ${res.label}. Data stayed on the same rooms.`
          : `Room type saved as ${res.label}.`,
      );
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

  // Filter rooms inside the mini window modal
  const filteredModalRooms = areaRooms.filter((r) =>
    r.name.toLowerCase().includes(modalSearch.toLowerCase()),
  );

  return (
    <>
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/90 bg-white shadow-[10px_18px_36px_rgba(150,168,195,0.32),-8px_-8px_24px_#d2d8e1,0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[12px_22px_42px_rgba(150,168,195,0.4),-10px_-10px_28px_#d2d8e1]">
        <div>
          {/* 1. TOP INSET IMAGE WELL (concave with sunken neomorphic depth) */}
          <div className="relative h-24 w-full overflow-hidden rounded-t-[1.5rem] bg-[#e8edf2] sm:h-28">
            {area.image ? (
              <img
                src={area.image}
                alt={`${area.label} interior`}
                loading="lazy"
                width={1024}
                height={640}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400">
                <ImageIcon className="h-10 w-10 stroke-[1.5] text-zinc-400" />
                <span className="mt-1 font-sans text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Image
                </span>
              </div>
            )}

            {/* Slight dark filter at the bottom of the image for readability */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

            {/* Area label pill overlay on top image */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-2 py-0.5 shadow-xs backdrop-blur-md">
              <span className="font-display text-[13px] font-extrabold leading-none tabular-nums text-zinc-950">
                {areaRooms.length}
              </span>
              <span className="h-3 w-px shrink-0 bg-zinc-300/70" aria-hidden="true" />
              {isStaff && editingLabel ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="h-6 w-28 bg-white text-[11px] font-bold"
                  />
                  <Button size="sm" className="h-6 px-2 text-[10px] bg-black text-white" onClick={() => saveLabel.mutate()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setEditingLabel(false)}>
                    X
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold leading-none text-zinc-500">
                    {area.label}
                  </span>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        setLabelDraft(area.label);
                        setEditingLabel(true);
                      }}
                      className="text-zinc-400 hover:text-black cursor-pointer"
                      title="Rename area"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Total progress: minimal ring with the text below it */}
            <div
              className="absolute bottom-2 right-2 flex flex-col items-center gap-0.5"
              title={`Total progress ${overallAreaPct}%`}
            >
              <span className="inline-flex items-center justify-center rounded-full border border-white/80 bg-white/90 p-0.5 shadow-xs backdrop-blur-md">
                <CircularProgress value={overallAreaPct} size={26} strokeWidth={3} />
              </span>
              <span className="rounded-full border border-white/80 bg-white/90 px-1.5 py-0.5 text-[7px] font-bold leading-none text-zinc-600 shadow-xs backdrop-blur-md">
                Total progress
              </span>
            </div>

            {isStaff && (
              <label
                htmlFor={imageInputId}
                className="absolute right-2 top-2 z-10 inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/80 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-zinc-800 shadow-xs backdrop-blur-md hover:bg-white cursor-pointer"
              >
                <Camera className="h-3 w-3" />
                {area.image ? "Change" : "Add"}
              </label>
            )}
            <input id={imageInputId} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
          </div>

          {/* 2. MIDDLE "RECENTLY UPDATED" ROW with 3 and a half (3.5) circular progress rings */}
          <div className="mt-2.5 px-3">
            <h3 className="inline-flex items-center gap-1 px-0.5 text-[10px] font-semibold tracking-normal text-zinc-500">
              <History className="h-3 w-3 text-zinc-400" aria-hidden="true" />
              Recently updated
            </h3>

            {/* 3 and a half circular progress bars visible in track */}
            <div className="mt-1.5 flex touch-auto items-center gap-2 overflow-x-auto overscroll-x-contain no-scrollbar scroll-smooth px-0.5 py-1.5">
              {areaRooms.map((room) => {
                const pct = getRoomProgress(room, area.slug as AreaSlug);
                const isSelected = room.id === selectedRoomId;
                const size = 44;
                const strokeWidth = 4;
                const radius = (size - strokeWidth - 3) / 2;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    style={{ flex: "0 0 calc((100% - 1.5rem) / 3.5)" }}
                    className="group relative flex flex-col items-center justify-center focus:outline-none cursor-pointer select-none"
                    title={`${room.name} (${pct}%)`}
                    aria-pressed={isSelected}
                    aria-label={`${room.name}, ${pct}% complete`}
                  >
                    {/* Circular progress container with inside grey and blue highlight for the current circle */}
                    <div
                      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f5f9] transition-all duration-300 ease-out ${
                        isSelected
                          ? "scale-110 shadow-[0_0_16px_rgba(59,130,246,0.4)] ring-2 ring-blue-500"
                          : "scale-90 hover:scale-100"
                      }`}
                    >
                      <svg width={size} height={size} className="-rotate-90 transform" aria-hidden="true">
                        {/* 1. Increased intensity grey back fill / back space */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="transparent"
                          stroke="#cbd5e1"
                          strokeWidth={strokeWidth}
                        />

                        {/* 2. Pure black progress arc with high intensity */}
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="transparent"
                          stroke={pct > 0 ? "#000000" : "transparent"}
                          strokeWidth={strokeWidth}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                          style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))" }}
                        />
                      </svg>

                      {/* Inside: percentage / number in pure black bold font on grey inner fill */}
                      <div className="absolute flex flex-col items-center justify-center leading-none">
                        <span className="font-display text-[10.5px] font-extrabold tabular-nums text-black">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Below outside circle: room name/text */}
                    <span
                      className={`mt-0.5 max-w-full truncate text-center text-[9px] font-bold tracking-tight transition-colors ${
                        isSelected ? "text-blue-600" : "text-zinc-500 group-hover:text-zinc-900"
                      }`}
                    >
                      {room.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM ROW: minimal View all link and visible Open button */}
        <div className="mt-3 border-t border-zinc-100 px-3 pb-3 pt-2.5">
          {/* Bottom Left: minimal View all link · Bottom Right: proper visible Open button */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setModalSearch("");
                setViewAllOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[#CAD4E1] px-2.5 py-1 text-[10.5px] font-bold text-zinc-800 transition-colors hover:bg-[#bcc8d8] hover:text-zinc-950 cursor-pointer"
            >
              <Eye className="h-3 w-3" />
              <span>View all</span>
            </button>

            <Link
              to="/area/$area"
              params={{ area: area.slug }}
              search={{ room: selectedRoom?.id ?? areaRooms[0]?.id ?? "" }}
              className="group/open inline-flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-[10.5px] font-bold text-white transition-all duration-200 hover:bg-zinc-800 hover:scale-105 active:scale-95 cursor-pointer"
              aria-label={`Open ${area.label}`}
            >
              Open
              <ArrowUpRight className="h-3 w-3 text-white transition-transform duration-300 group-hover/open:-translate-y-0.5 group-hover/open:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* MINI WINDOW MODAL DIALOG LISTING ALL CLASSROOMS */}
      <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-zinc-200/90 shadow-2xl rounded-[2rem] p-6 text-zinc-900">
          <DialogHeader className="border-b border-zinc-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <div>
                <DialogTitle className="font-display text-2xl font-extrabold text-zinc-950 uppercase tracking-tight">
                  {area.label}
                </DialogTitle>
                <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                  Full list of {areaRooms.length} {areaRooms.length === 1 ? "room" : "classrooms"} with live progress rings
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f1f5f9] px-3.5 py-1 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Overall</span>
                <span className="font-display text-sm font-extrabold text-black tabular-nums">{overallAreaPct}%</span>
              </div>
            </div>

            {/* Quick search input inside mini window */}
            {areaRooms.length > 4 && (
              <div className="mt-3.5 relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={`Search ${area.label} classrooms…`}
                  className="w-full h-10 pl-9.5 pr-8 rounded-full bg-[#f1f5f9] border border-zinc-200/80 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    className="absolute right-3 text-zinc-400 hover:text-black cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Grid listing all classrooms inside mini window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 max-h-[55vh] overflow-y-auto p-1">
            {filteredModalRooms.map((room) => {
              const pct = getRoomProgress(room, area.slug as AreaSlug);

              return (
                <Link
                  key={room.id}
                  to="/area/$area"
                  params={{ area: area.slug }}
                  search={{ room: room.id }}
                  onClick={() => setViewAllOpen(false)}
                  className="group flex items-center gap-3.5 p-3.5 rounded-2xl border border-zinc-200/80 bg-[#f8fafc] hover:bg-white hover:border-black hover:shadow-md transition-all cursor-pointer"
                >
                  <CircularProgress value={pct} size={50} strokeWidth={4.5} />

                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-extrabold text-sm text-zinc-950 truncate group-hover:text-black">
                      {room.name}
                    </h4>

                    {/* Progress track in mini window */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#cbd5e1]">
                        <div
                          className="h-full rounded-full bg-black transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-display text-[11px] font-extrabold text-black tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div className="h-8 w-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:text-black group-hover:border-black transition-colors shrink-0">
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              );
            })}

            {filteredModalRooms.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm font-semibold text-zinc-500">
                No classrooms matching “{modalSearch}”
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-3.5 flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Click any classroom to open work items</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewAllOpen(false)}
              className="rounded-full text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff image upload confirmation */}
      <AlertDialog open={!!pendingImage} onOpenChange={(o) => !o && setPendingImage(null)}>
        <AlertDialogContent className="bg-white border border-zinc-200 shadow-neo text-zinc-900 rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-950 font-bold">Update room type image?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              “{pendingImage?.name}” will be saved as WebP for {area.label}. Any format under 10 MB is accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-black text-white hover:bg-zinc-800"
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
    </>
  );
}
