import { useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS,
  getRoomProgress,
  getAreaOverallProgress,
  getEffectiveAreaRooms,
  AreaSlug,
  getCircularColor,
  STATUS_LABEL,
  areaLabel,
} from "@/lib/constants";
import { syncDashboardRooms } from "@/lib/db-sync";
import { getRoomDefaultWorkItems } from "@/lib/room-tasks";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { CircularProgress } from "@/components/CircularProgress";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/useAuth";
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Main Dashboard — AV DYNAMICS PRIVATE LIMITED" },
      {
        name: "description",
        content:
          "Live completion percentages for every smart class, lab, staff room, control room and facility areas, with open issues and the project countdown.",
      },
      { property: "og:title", content: "Main Dashboard — AV DYNAMICS PRIVATE LIMITED" },
      {
        property: "og:description",
        content: "Live completion percentages for every room and open site issues.",
      },
    ],
  }),
  component: DashboardPage,
});

export function SmartClassPartitionView({
  area,
  areaRooms,
}: {
  area: (typeof AREAS)[0];
  areaRooms: {
    id: string;
    area: string;
    name: string;
    work_items?: { id: string; title?: string; status: string; remarks?: string | null }[] | null;
  }[];
}) {
  const [pageIndex, setPageIndex] = useState(0);

  // Calculate overall area progress accurately across all 14 smart classes
  const overallAreaPct = getAreaOverallProgress(area.slug, areaRooms);

  // Show 5 room boxes per view (Page 1: 1-5, Page 2: 6-10, Page 3: 11-14)
  const pageSize = 5;
  const totalPages = Math.ceil(areaRooms.length / pageSize);
  const visibleRooms = areaRooms.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const nextBatchCount = Math.min(pageSize, areaRooms.length - (pageIndex + 1) * pageSize);

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
        {/* Left Thumbnail Image */}
        <Link
          to="/area/$area"
          params={{ area: area.slug }}
          search={{ room: areaRooms[0]?.id ?? "" }}
          className="group relative flex h-28 items-end overflow-hidden rounded-xl border border-border"
        >
          <img
            src={area.image}
            alt={`${area.label} interior`}
            loading="lazy"
            width={1024}
            height={640}
            className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-75"
          />
          <span className="relative z-10 w-full bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 font-display text-2xl uppercase font-semibold">
            {area.label}
          </span>
        </Link>

        <div className="space-y-3">
          {/* Section Header: Overall Circular Progress & Page Indicator */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-3">
              <CircularProgress value={overallAreaPct} size={46} strokeWidth={5} />
              <div>
                <div className="text-sm font-semibold uppercase text-foreground">
                  {area.label} 
                </div>
                <div className="text-xs text-muted-foreground">
                   {14 } rooms
                  
                </div>
              </div>
            </div>

            {/* Pagination Dots indicator */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPageIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${pageIndex === i ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/50"
                    }`}
                  aria-label={`Go to page ${i + 1}`}
                  title={`Smart Class ${i * pageSize + 1}–${Math.min((i + 1) * pageSize, areaRooms.length)}`}
                />
              ))}
            </div>
          </div>

          {/* Clean Room Tab Boxes with Interactive Next / Prev elements inline */}
          <div className="flex flex-wrap items-center gap-3 py-1">
            {/* Inline Previous Tile (if on page > 0) */}
            {pageIndex > 0 && (
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                className="flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 border-border/80 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground shadow-xs group"
                title={`Back to Smart Class ${(pageIndex - 1) * pageSize + 1}–${pageIndex * pageSize}`}
              >
                <div className="flex items-center gap-1 font-display text-lg font-bold text-foreground">
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span>Prev</span>
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  1–{pageIndex * pageSize}
                </span>
              </button>
            )}

            {/* Room Boxes for current slice */}
            {visibleRooms.map((room) => {
              const pct = getRoomProgress(room, area.slug);
              const colorInfo = getCircularColor(pct);
              return (
                <Link
                  key={room.id}
                  to="/area/$area"
                  params={{ area: area.slug }}
                  search={{ room: room.id }}
                  className={`flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent ${colorInfo.border} ${colorInfo.bg}`}
                >
                  <span
                    className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}
                  >
                    {pct}%
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-foreground whitespace-nowrap">
                    {room.name}
                  </span>
                </Link>
              );
            })}

            {/* Inline Next Element directly following the 5th room */}
            {pageIndex < totalPages - 1 && (
              <button
                type="button"
                onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                className="flex min-w-[7rem] flex-col items-center justify-center rounded-xl border-2 border-primary/50 bg-primary/10 hover:bg-primary/20 px-4 py-3 transition hover:scale-105 cursor-pointer text-primary shadow-xs group"
                title={`Go to next ${nextBatchCount} smart classes`}
              >
                <div className="flex items-center gap-1 font-display text-lg font-bold text-primary">
                  <span>Next {nextBatchCount}</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-primary/80 whitespace-nowrap">
                  {(pageIndex + 1) * pageSize + 1}–
                  {Math.min((pageIndex + 2) * pageSize, areaRooms.length)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewRoomDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [areaType, setAreaType] = useState<AreaSlug>("staff_room");
  const [roomName, setRoomName] = useState("");
  const [roomCount, setRoomCount] = useState(1);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const [customAreaPreset, setCustomAreaPreset] = useState<string | null>(null);
  const [works, setWorks] = useState<
    { heading: string; subheading: string; work: string; action: "work" | "material" }[]
  >([{ heading: "", subheading: "", work: "", action: "work" }]);

  // Custom areas created earlier (via "Others…") — persist so staff can reuse
  // them as predefined room types on the next visit without re-typing the name.
  const builtinSlugs = new Set(AREAS.map((a) => a.slug));
  const { data: customAreas = [] } = useQuery({
    queryKey: ["custom-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("area")
        .neq("area", "admin_room");
      if (error) throw error;
      const slugSet = new Set<string>();
      for (const row of data ?? []) {
        const slug = String(row.area).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (slug && !builtinSlugs.has(slug)) slugSet.add(slug);
      }
      return Array.from(slugSet).sort();
    },
  });

  const reset = () => {
    setAreaType("staff_room");
    setRoomName("");
    setRoomCount(1);
    setIsCustomArea(false);
    setCustomArea("");
    setCustomAreaPreset(null);
    setWorks([{ heading: "", subheading: "", work: "", action: "work" }]);
  };

  const titleCase = (s: string) =>
    s
      .split(/[-_]/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  // Turn a free-text area name into a url-usable slug, e.g. "Gym Hall" -> "gym-hall".
  const toSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const updateWork = (
    idx: number,
    patch: Partial<(typeof works)[number]>,
  ) => {
    setWorks((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  };

  const createRoom = useMutation({
    mutationFn: async () => {
      let areaValue = customAreaPreset ?? areaType;
      if (isCustomArea) {
        const customSlug = toSlug(customArea);
        if (!customSlug) throw new Error("Please enter a new area name (e.g. Gym Hall).");
        areaValue = customSlug as AreaSlug;
      }
      const baseName = roomName.trim();
      if (!baseName) throw new Error("Please enter a room name (e.g. Staff Room).");
      const count = Math.max(1, Math.floor(roomCount) || 1);
      const validWorks = works.filter((w) => w.heading.trim() && w.subheading.trim() && w.work.trim());
      // Auto-seed defaults only for known room types; a brand-new or custom area gets no template.
      const useDefaults = validWorks.length === 0 && !isCustomArea && !customAreaPreset;

      const created: { id: string; name: string }[] = [];
      for (let i = 1; i <= count; i++) {
        const name = count > 1 ? `${baseName} ${i}` : baseName;
        const { data: room, error: roomErr } = await supabase
          .from("rooms")
          .insert({ area: areaValue, name, sort_order: 999 })
          .select("id")
          .single();
        if (roomErr) throw new Error(roomErr.message || "Failed to create room");

        if (useDefaults) {
          const defaults = getRoomDefaultWorkItems(areaType, name);
          if (defaults.length > 0) {
            const toInsert = defaults.map((t) => ({
              room_id: room.id,
              group_name: t.group_name,
              subgroup: t.subgroup,
              title: t.title,
              kind: t.kind,
              sort_order: t.sort_order,
            }));
            const { error: itemsErr } = await supabase.from("work_items").insert(toInsert);
            if (itemsErr) throw new Error(itemsErr.message || "Failed to save room tasks");
          }
        } else {
          const toInsert = validWorks.map((w, idx) => ({
            room_id: room.id,
            group_name: w.heading.trim(),
            subgroup: w.subheading.trim(),
            title: w.work.trim(),
            kind: w.action,
            status: "hold" as const,
            sort_order: idx + 1,
          }));
          const { error: itemsErr } = await supabase.from("work_items").insert(toInsert);
          if (itemsErr) throw new Error(itemsErr.message || "Failed to save room tasks");
        }
        created.push({ id: room.id, name });
      }
      return { names: created.map((c) => c.name) };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
      setOpen(false);
      reset();
      toast.success(`Room(s) created: ${res.names.join(", ")}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeArea = AREAS.find((a) => a.slug === areaType);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-w-[6.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-primary transition hover:scale-105 hover:bg-primary/15 cursor-pointer"
          title="Create a new room"
        >
          <Plus className="h-6 w-6" />
          <span className="text-[11px] font-semibold">New Room</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Create New Room</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Room Type
              </Label>
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
                    // A previously-created custom area.
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
                  {customAreas.length > 0 && (
                    <SelectItem value={`__custom_${customAreas.join("__")}`} disabled className="pointer-events-none opacity-60">
                      Your custom areas
                    </SelectItem>
                  )}
                  {customAreas.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {titleCase(slug)}
                    </SelectItem>
                  ))}
                  <SelectItem value="__others">+ New custom area (Others…)…</SelectItem>
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
                New Area Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-area-name"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Gym Hall, Cafeteria, Auditorium"
              />
              <p className="text-xs text-muted-foreground">
                Creates a brand-new tab for this area that isn't listed above.
              </p>
            </div>
          )}
          {customAreaPreset && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Area
              </Label>
              <Input readOnly value={titleCase(customAreaPreset)} className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">
                Adding another room to the <span className="font-medium">{titleCase(customAreaPreset)}</span> area you created earlier.
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
              placeholder={`e.g. ${isCustomArea ? customArea || "Gym Hall" : activeArea?.label}`}
            />
            <p className="text-xs text-muted-foreground">
              e.g. “Staff Room”. If you set No. of Rooms = 3, it creates Staff Room 1, 2 and 3.
            </p>
          </div>

          {/* Optional works list: heading → subheading → work → action */}
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
                title="Add another work row"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Leave empty to auto-fill the standard works for this room type.
            </p>
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
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/60 hover:text-red-600 transition cursor-pointer"
                    title="Remove this work row"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={w.subheading}
                  onChange={(e) => updateWork(idx, { subheading: e.target.value })}
                  placeholder="Sub heading (e.g. False Ceiling)"
                  className="h-8 text-xs"
                />
                <div className="grid grid-cols-[1fr_8rem] gap-1.5">
                  <Input
                    value={w.work}
                    onChange={(e) => updateWork(idx, { work: e.target.value })}
                    placeholder="Work / task (e.g. Plain false ceiling)"
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
          <Button onClick={() => createRoom.mutate()} disabled={createRoom.isPending}>
            {createRoom.isPending ? "Creating…" : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrintReportDialog({
  trigger,
}: {
  trigger: (o: { open: () => void }) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!reportDate) {
      toast.error("Please select a date.");
      return;
    }
    setGenerating(true);
    try {
      const startOfDay = new Date(reportDate + "T00:00:00").toISOString();
      const endOfDay = new Date(reportDate + "T23:59:59.999").toISOString();

      const { data: updates, error } = await supabase
        .from("work_updates")
        .select("work_item_id, status, remarks, created_at")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const list = updates ?? [];
      const itemIds = Array.from(new Set(list.map((u) => u.work_item_id)));
      let itemsMap = new Map<string, { title: string; roomName: string; area: string }>();
      if (itemIds.length > 0) {
        const { data: items, error: iErr } = await supabase
          .from("work_items")
          .select("id, title, room_id");
        if (iErr) throw iErr;
        const roomIds = Array.from(new Set((items ?? []).map((it) => it.room_id)));
        let roomsMap = new Map<string, { name: string; area: string }>();
        if (roomIds.length > 0) {
          const { data: rooms, error: rErr } = await supabase
            .from("rooms")
            .select("id, name, area")
            .in("id", roomIds);
          if (rErr) throw rErr;
          roomsMap = new Map((rooms ?? []).map((r) => [r.id, { name: r.name, area: r.area }]));
        }
        itemsMap = new Map(
          (items ?? []).map((it) => {
            const rm = roomsMap.get(it.room_id);
            return [
              it.id,
              { title: it.title, roomName: rm?.name ?? "", area: rm?.area ?? "" },
            ];
          }),
        );
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("AV DYNAMICS PRIVATE LIMITED", 40, 40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Daily Works Progress Report", 40, 60);
      const prettyDate = new Date(reportDate + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Date: ${prettyDate}`, 40, 78);
      doc.text(`Total updates recorded: ${list.length}`, 40, 96);

      if (list.length === 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "italic");
        doc.text("No staff updates were recorded on this date.", 40, 130);
      } else {
        const body = list.map((u) => {
          const info = itemsMap.get(u.work_item_id);
          return [
            info?.area ? areaLabel(info.area) : "",
            info?.roomName ?? "",
            info?.title ?? "",
            STATUS_LABEL[u.status] ?? u.status,
            u.remarks?.trim() || "",
            new Date(u.created_at).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }),
          ];
        });
        autoTable(doc, {
          startY: 112,
          head: [["Area", "Room", "Work / Task", "Status", "Remarks", "Time"]],
          body,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 3) {
              data.cell.styles.textColor = [37, 99, 235];
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
      }

      doc.save(`Daily_Report_${reportDate}.pdf`);
      toast.success("PDF report downloaded.");
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger({ open: () => setOpen(true) })}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Print Daily Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="report-date" className="text-xs font-semibold uppercase text-muted-foreground">
            Select date
          </Label>
          <Input
            id="report-date"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The report lists every process updated by staff on this date (issues, holds,
            in-progress, completed, ordered, received, supplied, installed), including remarks.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage() {
  const { data: settings } = useSettings();
  const isStaff = useAuth().isStaff;
  const [selectedDate, setSelectedDate] = useState<string>("");
  const targetDeadline = settings?.deadline || "2026-04-15";

  const { data: lastUpdatedAt } = useQuery({
    queryKey: ["last-data-updated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_updates")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data?.created_at) return data.created_at;

      const { data: item } = await supabase
        .from("work_items")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return item?.updated_at ?? null;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ["rooms-progress", selectedDate],
    queryFn: async () => {
      await syncDashboardRooms();
      const { data, error } = await supabase
        .from("rooms")
        .select("id, area, name, sort_order, work_items(id, title, status, remarks, updated_at)")
        .order("sort_order");
      if (error) throw error;

      // Default dashboard: latest saved status. Date picker: that calendar day's logs only.
      if (selectedDate) {
        const startOfDay = new Date(selectedDate + "T00:00:00").toISOString();
        const endOfDay = new Date(selectedDate + "T23:59:59.999").toISOString();
        const itemIds = (data ?? []).flatMap((room) => (room.work_items ?? []).map((item) => item.id));

        const latestByItem = new Map<string, { status: string; remarks: string | null }>();
        if (itemIds.length > 0) {
          const { data: updates, error: updatesErr } = await supabase
            .from("work_updates")
            .select("work_item_id, status, remarks, created_at")
            .in("work_item_id", itemIds)
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay)
            .order("created_at", { ascending: true });
          if (updatesErr) throw updatesErr;
          for (const update of updates ?? []) {
            latestByItem.set(update.work_item_id, {
              status: update.status,
              remarks: update.remarks,
            });
          }
        }

        return (data ?? []).map((room) => ({
          ...room,
          work_items: (room.work_items ?? []).map((item) => {
            const dayUpdate = latestByItem.get(item.id);
            if (dayUpdate) {
              return { ...item, status: dayUpdate.status, remarks: dayUpdate.remarks };
            }
            return { ...item, status: "hold", remarks: null };
          }),
        }));
      }

      return data ?? [];
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  // Custom areas created via the "Others…" option appear as brand-new tabs.
  const knownSlugs = AREAS.map((a) => a.slug);
  const extraAreaSlugs = Array.from(
    new Set(rawRooms.map((r) => r.area).filter((a): a is string => !!a && !knownSlugs.includes(a))),
  );
  const titleCase = (s: string) =>
    s
      .split(/[-_]/)
      .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
      .join(" ");

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Higher Secondary School" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl uppercase font-display font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? `Showing work recorded on ${new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} only.`
                : " "}
            </p>
            {lastUpdatedAt && (
              <p className="text-emerald-400 font-semibold text-sm leading-relaxed tracking-wide flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Last updated{" "}
                  {new Date(lastUpdatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {targetDeadline && (
              <div className="flex items-center gap-3.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-surface px-4 py-2.5 shadow-sm">
                <div className="text-center min-w-[3.5rem]">
                  <div className="font-display text-3xl sm:text-4xl font-bold leading-none text-primary">
                    {daysLeft(targetDeadline)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mt-0.5">
                    {daysLeft(targetDeadline) === 1 ? "Day Left" : "Days Left"}
                  </div>
                </div>
                <div className="h-9 w-px bg-primary/20" />
                <div className="text-xs">
                  <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Deadline
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {new Date(targetDeadline + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* 1. Wrap the entire section in a column container with spacing */}
            <div className="flex flex-col gap-1.5 items-start">

              {/* 2. Add your text label here */}
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Past History
              </span>

              {/* 3. Your original container box (with custom border color) */}
              <div className="flex items-center gap-2 rounded-xl border-2 border-white bg-surface px-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto text-sm h-8"
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate("")}
                    className="h-8 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <IssueDock />
            {isStaff && (
              <PrintReportDialog
                trigger={({ open }) => (
                  <Button size="sm" variant="outline" onClick={open}>
                    <Printer className="mr-1 h-4 w-4" /> Print Report
                  </Button>
                )}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground p-4">Loading dashboard rooms…</p>
          )}

          {AREAS.map((area) => {
            const areaRooms = getEffectiveAreaRooms(area.slug as AreaSlug, rawRooms);
            const overallAreaPct = getAreaOverallProgress(area.slug as AreaSlug, areaRooms);

            if (area.slug === "smart_class") {
              return (
                <SmartClassPartitionView key={area.slug} area={area} areaRooms={areaRooms} />
              );
            }

            return (
              <section key={area.slug} className="panel overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
                  {/* Left Thumbnail Image */}
                  <Link
                    to="/area/$area"
                    params={{ area: area.slug }}
                    search={{ room: areaRooms[0]?.id ?? "" }}
                    className="group relative flex h-28 items-end overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={area.image}
                      alt={`${area.label} interior`}
                      loading="lazy"
                      width={1024}
                      height={640}
                      className="absolute inset-0 h-full w-full object-cover opacity-50 transition group-hover:opacity-75"
                    />
                    <span className="relative z-10 w-full bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 font-display text-2xl uppercase font-semibold">
                      {area.label}
                    </span>
                  </Link>

                  <div className="space-y-3">
                    {/* Section Header: Overall Circular Progress */}
                    <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                      <CircularProgress value={overallAreaPct} size={46} strokeWidth={5} />
                      <div>
                        <div className="text-sm font-semibold uppercase text-foreground">
                          {area.label} 
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {areaRooms.length} {areaRooms.length === 1 ? "room" : "rooms"}
                        </div>
                      </div>
                    </div>

                    {/* Clean Room Tab Boxes */}
                    <div className="flex flex-wrap gap-3">
                      {areaRooms.map((room) => {
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
                            <span
                              className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}
                            >
                              {pct}%
                            </span>
                            <span className="mt-1 text-[11px] font-medium text-foreground">
                              {room.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {/* Brand-new areas created via "Others…" — each becomes its own tab */}
          {extraAreaSlugs.map((slug) => {
            const extraRooms = getEffectiveAreaRooms(slug as AreaSlug, rawRooms);
            const extraPct = getAreaOverallProgress(slug as AreaSlug, extraRooms);
            return (
              <section key={slug} className="panel overflow-hidden">
                <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,16rem)_1fr] md:items-center">
                  <Link
                    to="/area/$area"
                    params={{ area: slug }}
                    search={{ room: extraRooms[0]?.id ?? "" }}
                    className="group relative flex h-28 items-end overflow-hidden rounded-xl border border-border bg-primary/5"
                  >
                    <span className="relative z-10 w-full bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3 font-display text-2xl uppercase font-semibold">
                      {titleCase(slug)}
                    </span>
                  </Link>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                      <CircularProgress value={extraPct} size={46} strokeWidth={5} />
                      <div>
                        <div className="text-sm font-semibold uppercase text-foreground">
                          {titleCase(slug)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {extraRooms.length} {extraRooms.length === 1 ? "room" : "rooms"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {extraRooms.map((room) => {
                        const pct = getRoomProgress(room, slug as AreaSlug);
                        const colorInfo = getCircularColor(pct);
                        return (
                          <Link
                            key={room.id}
                            to="/area/$area"
                            params={{ area: slug }}
                            search={{ room: room.id }}
                            className={`flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent ${colorInfo.border} ${colorInfo.bg}`}
                          >
                            <span
                              className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}
                            >
                              {pct}%
                            </span>
                            <span className="mt-1 text-[11px] font-medium text-foreground">
                              {room.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {/* Create New Room — page bottom, sized like each room tab (staff only) */}
          {isStaff && (
            <section className="panel overflow-hidden">
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <NewRoomDialog />
                  <div className="text-xs text-muted-foreground max-w-[16rem]">
                    Add a new room (choose a type like Staff Room, Admin Room or Smart Class)
                    and a number. It will appear as a new tab above with its default works.
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
