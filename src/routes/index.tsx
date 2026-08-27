import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AREAS,
  getRoomProgress,
  getAreaOverallProgress,
  getEffectiveAreaRooms,
  AreaSlug,
  getCircularColor,
} from "@/lib/constants";
import { syncDashboardRooms } from "@/lib/db-sync";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { CircularProgress } from "@/components/CircularProgress";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
                  {area.label} Overall
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing Smart Class {pageIndex * pageSize + 1}–
                  {Math.min((pageIndex + 1) * pageSize, areaRooms.length)} of {areaRooms.length}
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

function DashboardPage() {
  const { data: settings } = useSettings();
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

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Higher Secondary School" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl uppercase font-display font-semibold">Overall progress</h1>
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? `Showing work recorded on ${new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} only.`
                : "Tap an area to open the details view, or tap a room to jump straight into it."}
            </p>
            {lastUpdatedAt && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last data updated{" "}
                {new Date(lastUpdatedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
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
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
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
            <IssueDock />
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
              return <SmartClassPartitionView key={area.slug} area={area} areaRooms={areaRooms} />;
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
                          {area.label} Overall
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {areaRooms.length} {areaRooms.length === 1 ? "room" : "rooms"} total
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
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
