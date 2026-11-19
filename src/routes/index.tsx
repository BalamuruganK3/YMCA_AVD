import { useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS,
  collectAreaRooms,
  getRoomProgress,
  AreaSlug,
  getItemDisplayStatus,
  getItemWeight,
} from "@/lib/constants";
import { syncDashboardRooms } from "@/lib/db-sync";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { ScrollToTop } from "@/components/ScrollToTop";
import { NewRoomDialog } from "@/components/NewRoomDialog";
import { AreaRoomsSection } from "@/components/AreaRoomsSection";
import { useAuth } from "@/hooks/useAuth";
import { OVERALL_REMARKS_TITLE } from "@/lib/room-remarks";
import { buildAreaCatalog, type AreaSettingRow } from "@/lib/area-catalog";
import ymcaLogo from "@/assets/YMCA.jpeg";
import avDynamicsLogo from "@/assets/AV DYNAMICS PRIVATE LIMITED LOGO.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function pdfImageFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

function fitPdfImage(naturalW: number, naturalH: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return { w: naturalW * scale, h: naturalH * scale };
}

function loadPdfImageSize(dataUrl: string) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read logo size"));
    img.src = dataUrl;
  });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Main Dashboard — AV DYNAMICS PRIVATE LIMITED" },
      {
        name: "description",
        content:
          "Live completion percentages for every classroom, lab, staff room, control room and facility area, with open issues and the project countdown.",
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


function PrintReportDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: (o: { open: () => void }) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
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
      const endOfDay = new Date(reportDate + "T23:59:59.999").toISOString();

      const pageSize = 1000;
      const fetchAll = async <T,>(
        run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
      ): Promise<T[]> => {
        const all: T[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await run(from, from + pageSize - 1);
          if (error) throw error;
          const chunk = data ?? [];
          all.push(...chunk);
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
        return all;
      };

      type RoomRow = { id: string; area: string; name: string; sort_order: number };
      type ItemRow = {
        id: string;
        room_id: string;
        group_name: string;
        subgroup: string | null;
        title: string;
        kind: string;
        status: string;
        remarks: string | null;
        sort_order: number;
        created_at: string;
      };
      type UpdateRow = { work_item_id: string; status: string; remarks: string | null; created_at: string };

      const rooms = await fetchAll<RoomRow>((from, to) =>
        supabase.from("rooms").select("id, area, name, sort_order").order("sort_order").range(from, to),
      );
      const items = await fetchAll<ItemRow>((from, to) =>
        supabase
          .from("work_items")
          .select("id, room_id, group_name, subgroup, title, kind, status, remarks, sort_order, created_at")
          .order("sort_order")
          .range(from, to),
      );
      const updates = await fetchAll<UpdateRow>((from, to) =>
        supabase
          .from("work_updates")
          .select("work_item_id, status, remarks, created_at")
          .lte("created_at", endOfDay)
          .order("created_at", { ascending: true })
          .range(from, to),
      );

      const latestByItem = new Map<string, { status: string; remarks: string | null }>();
      for (const update of updates) {
        latestByItem.set(update.work_item_id, {
          status: update.status,
          remarks: update.remarks,
        });
      }

      type ProcessRow = {
        id: string;
        room_id: string;
        group_name: string;
        subgroup: string | null;
        title: string;
        kind: string;
        status: string;
        remarks: string | null;
        sort_order: number;
      };

      const processesByRoom = new Map<string, ProcessRow[]>();
      for (const item of items) {
        if (item.title === OVERALL_REMARKS_TITLE) continue;
        if (item.created_at && item.created_at > endOfDay) continue;
        const asOf = latestByItem.get(item.id);
        const row: ProcessRow = {
          id: item.id,
          room_id: item.room_id,
          group_name: item.group_name,
          subgroup: item.subgroup,
          title: item.title,
          kind: item.kind,
          status: asOf?.status ?? item.status ?? "hold",
          remarks: asOf?.remarks ?? item.remarks ?? null,
          sort_order: item.sort_order,
        };
        const list = processesByRoom.get(item.room_id) ?? [];
        list.push(row);
        processesByRoom.set(item.room_id, list);
      }

      const knownSlugs = AREAS.map((a) => a.slug);
      const extraSlugs = Array.from(
        new Set(rooms.map((r) => r.area).filter((a) => a && !knownSlugs.includes(a as AreaSlug))),
      );
      const orderedAreaSlugs = [...knownSlugs, ...extraSlugs];

      const body: string[][] = [];
      for (const slug of orderedAreaSlugs) {
        const areaRooms = collectAreaRooms(slug, null, rooms);
        const typeLabel = AREAS.find((a) => a.slug === slug)?.label ?? slug.replace(/[-_]/g, " ");
        for (const room of areaRooms) {
          const processes = (processesByRoom.get(room.id) ?? []).sort(
            (a, b) => a.sort_order - b.sort_order,
          );
          const roomPct = getRoomProgress(
            { name: room.name, work_items: processes },
            slug as AreaSlug,
          );
          if (processes.length === 0) {
            body.push([
              typeLabel,
              `${room.name} (${roomPct}%)`,
              "",
              "No processes",
              "",
              `${roomPct}%`,
            ]);
            continue;
          }
          for (const process of processes) {
            const pct = Math.round(getItemWeight(process) * 100);
            body.push([
              typeLabel,
              `${room.name} (${roomPct}%)`,
              process.group_name || "",
              process.title,
              getItemDisplayStatus(process, false),
              `${pct}%`,
            ]);
          }
        }
      }

      let logoDataUrl = "";
      let avLogoDataUrl = "";
      const toDataUrl = async (src: string) => {
        const res = await fetch(src);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      try {
        logoDataUrl = await toDataUrl(ymcaLogo);
      } catch {
        logoDataUrl = "";
      }
      try {
        avLogoDataUrl = await toDataUrl(avDynamicsLogo);
      } catch {
        avLogoDataUrl = "";
      }

      const ymcaSize = logoDataUrl ? await loadPdfImageSize(logoDataUrl).catch(() => ({ w: 1, h: 1 })) : null;
      const avSize = avLogoDataUrl ? await loadPdfImageSize(avLogoDataUrl).catch(() => ({ w: 397, h: 520 })) : null;

      const prettyDate = new Date(reportDate + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const schoolName = "YMCA Boys Town Higher Secondary School, Kottivakkam, Chennai";

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerTop = 14;
      const ymcaFit = ymcaSize ? fitPdfImage(ymcaSize.w, ymcaSize.h, 48, 48) : { w: 0, h: 0 };
      // Stacked AV Dynamics mark is 397x520 — keep that ratio, never stretch into a wide box.
      const avFit = avSize ? fitPdfImage(avSize.w, avSize.h, 50, 64) : { w: 0, h: 0 };
      const headerBottom = headerTop + Math.max(ymcaFit.h, avFit.h, 48);
      const tableTop = headerBottom + 22;

      const drawHeader = () => {
        if (logoDataUrl && ymcaSize) {
          doc.addImage(logoDataUrl, pdfImageFormat(logoDataUrl), 40, headerTop, ymcaFit.w, ymcaFit.h);
        }
        if (avLogoDataUrl && avSize) {
          const avX = pageWidth - 40 - avFit.w;
          doc.addImage(
            avLogoDataUrl,
            pdfImageFormat(avLogoDataUrl),
            avX,
            headerTop,
            avFit.w,
            avFit.h,
            undefined,
            "FAST",
          );
        }
        const textX = logoDataUrl ? 40 + ymcaFit.w + 10 : 40;
        const textMaxW = pageWidth - textX - 40 - (avLogoDataUrl ? avFit.w + 12 : 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const nameLines = doc.splitTextToSize(schoolName, textMaxW);
        doc.text(nameLines, textX, headerTop + 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const subtitleY = headerTop + 16 + nameLines.length * 14;
        doc.text("Daily Works Progress Report", textX, subtitleY);
        doc.text(`As of ${prettyDate}`, textX, subtitleY + 14);
      };

      if (body.length === 0) {
        drawHeader();
        doc.setFontSize(12);
        doc.setFont("helvetica", "italic");
        doc.text("No rooms or processes were found for this report.", 40, tableTop + 16);
      } else {
        autoTable(doc, {
          startY: tableTop,
          margin: { top: tableTop, left: 40, right: 40 },
          head: [["Room Type", "Room", "Heading", "Process", "Status", "% Complete"]],
          body,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [37, 99, 235], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 130 },
            2: { cellWidth: 110 },
            3: { cellWidth: 220 },
            4: { cellWidth: 90 },
            5: { cellWidth: 70, halign: "right" },
          },
          didDrawPage: () => {
            drawHeader();
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 5) {
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
      }

      doc.save(`YMCA Boys School_${reportDate}.pdf`);
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
      {trigger ? <DialogTrigger asChild>{trigger({ open: () => setOpen(true) })}</DialogTrigger> : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg mb-">Print Daily Report</DialogTitle>
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
            The report follows dashboard room-type order (Classrooms, Labs, Staff Room, and so on).
            Each room lists its processes and the completion percentage as of this date. Rooms with no
            updates on this date keep their last saved progress from previous days.
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
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { isStaff } = useAuth();
  const isAdminView = !isStaff;
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [printOpen, setPrintOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingDash, setEditingDash] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const targetDeadline = settings?.deadline || "2026-04-15";
  const dashTitle = settings?.dashboard_title?.trim() || "Dashboard";
  const dashSubtitle = settings?.dashboard_subtitle ?? "";
  const refreshMs = isAdminView ? 60_000 : 30_000;

  const saveDashText = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("project_settings")
        .update({
          dashboard_title: titleDraft.trim() || "Dashboard",
          dashboard_subtitle: subtitleDraft,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .select("deadline, project_name, dashboard_title, dashboard_subtitle")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("Dashboard text was not saved. Sign in as staff and try again.");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["project-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["project-settings"] });
      setEditingDash(false);
      toast.success("Dashboard text updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
    refetchInterval: refreshMs,
    refetchIntervalInBackground: true,
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
    refetchInterval: refreshMs,
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
    refetchInterval: refreshMs,
    refetchIntervalInBackground: true,
  });

  const catalog = buildAreaCatalog(rawRooms, areaSettings);
  const matchingAreasCount = searchQuery.trim()
    ? catalog.filter((area) => {
        const rooms = collectAreaRooms(area.slug, area.sourceArea, rawRooms);
        return (
          area.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rooms.some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }).length
    : catalog.length;

  return (
    <div className="min-h-screen pb-16">
      <AppHeader
        subtitle="Higher Secondary School"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        resultCount={matchingAreasCount}
        historyValue={selectedDate}
        onHistoryChange={setSelectedDate}
        onPrint={isStaff ? () => setPrintOpen(true) : undefined}
        onAddRoom={isStaff ? () => setAddRoomOpen(true) : undefined}
      />

      <NewRoomDialog open={addRoomOpen} onOpenChange={setAddRoomOpen} />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <div
          id="overview"
          className="flex flex-wrap items-center justify-between gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center"
        >
          <div className="order-2 min-w-0 flex-1 text-center sm:order-none sm:text-left">
            {isStaff && editingDash ? (
              <div className="space-y-2 max-w-xl">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="text-xl font-display uppercase h-11 bg-white"
                  placeholder="Dashboard title"
                />
                <Input
                  value={subtitleDraft}
                  onChange={(e) => setSubtitleDraft(e.target.value)}
                  className="bg-white"
                  placeholder="Optional subtitle for this dashboard"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveDashText.mutate()} disabled={saveDashText.isPending} className="bg-zinc-950 text-white rounded-full">
                    Save text
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDash(false)} className="rounded-full">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-3xl uppercase font-display font-bold tracking-tight text-zinc-950 sm:text-4xl">
                    {dashTitle}
                  </h1>
                  {isStaff && (
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-zinc-950 cursor-pointer"
                      title="Edit dashboard text"
                      onClick={() => {
                        setTitleDraft(dashTitle);
                        setSubtitleDraft(dashSubtitle);
                        setEditingDash(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {selectedDate || dashSubtitle ? (
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    {selectedDate
                      ? `Showing work recorded on ${new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} only.`
                      : dashSubtitle}
                  </p>
                ) : null}
              </>
            )}

            {/* Last updated timestamp with Clock icon */}
            {lastUpdatedAt && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold leading-relaxed tracking-wide text-zinc-700 sm:justify-start">
                <Clock className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
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

          {targetDeadline && (
            <div className="order-1 flex w-full justify-center sm:order-none sm:w-auto">
              <div className="flex w-fit items-center gap-3.5 rounded-2xl border border-white/90 bg-[#dfe5eb] px-4 py-2.5 shadow-neo-sm sm:mx-0">
                <div className="min-w-[3.5rem] text-center">
                  <div className="font-display text-3xl font-extrabold leading-none text-zinc-950 sm:text-4xl">
                    {daysLeft(targetDeadline)}
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {daysLeft(targetDeadline) === 1 ? "Day Left" : "Days Left"}
                  </div>
                </div>
                <div className="h-9 w-px bg-zinc-300" />
                <div className="text-center text-xs">
                  <div className="font-bold uppercase tracking-wider text-zinc-500">
                    Target Deadline
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {new Date(targetDeadline + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="order-3 ml-auto hidden w-full flex-wrap items-center justify-end gap-3 sm:order-none sm:flex sm:w-auto lg:ml-0 lg:justify-self-end">
            <div className="hidden w-full flex-col items-start gap-1 sm:flex sm:w-auto">
              <span className="pl-1 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                History
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/90 bg-[#dfe5eb] px-3 py-1 shadow-neo-sm">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 w-auto min-w-[9rem] rounded-none border-0 bg-transparent text-sm text-zinc-900 shadow-none focus-visible:ring-0 [color-scheme:light] sm:min-w-0"
                />
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate("")} className="h-7 px-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-full cursor-pointer">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {isStaff && (
              <PrintReportDialog
                open={printOpen}
                onOpenChange={setPrintOpen}
                trigger={({ open }) => (
                  <Button size="sm" variant="outline" onClick={open} className="hidden rounded-full border-white/90 bg-white/80 font-bold text-zinc-800 shadow-neo-sm hover:bg-white hover:text-zinc-950 cursor-pointer sm:inline-flex lg:mt-4">
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Report
                  </Button>
                )}
              />
            )}
          </div>
        </div>

        {/* Detailed Room Status: cards matching uploaded reference UI */}
        <div id="classrooms" className="space-y-6 pt-2">
          {searchQuery && (
            <div className="flex justify-end border-b border-zinc-200/90 pb-2.5">
              <span className="text-xs font-bold text-zinc-500">
                Filtered by “{searchQuery}” ({matchingAreasCount} matching)
              </span>
            </div>
          )}

          {isLoading && (
            <p className="text-sm font-medium text-zinc-500 p-4">Loading dashboard rooms…</p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.map((area) => {
              const areaRooms = collectAreaRooms(area.slug, area.sourceArea, rawRooms);
              if (areaRooms.length === 0) return null;

              if (searchQuery.trim()) {
                const matchesArea = area.label.toLowerCase().includes(searchQuery.toLowerCase());
                const matchingRooms = areaRooms.filter((r) =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase()),
                );
                if (!matchesArea && matchingRooms.length === 0) return null;
              }

              return (
                <AreaRoomsSection
                  key={area.slug}
                  area={area}
                  areaRooms={areaRooms}
                  isStaff={isStaff}
                  settings={areaSettings}
                />
              );
            })}
          </div>

        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}

