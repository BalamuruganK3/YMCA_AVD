import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, progressOf, getEffectiveAreaRooms, AreaSlug, getCircularColor } from "@/lib/constants";
import { syncDashboardRooms } from "@/lib/db-sync";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { useAuth } from "@/hooks/useAuth";
import { DeadlineSetting } from "@/components/DeadlineSetting";
import { CircularProgress } from "@/components/CircularProgress";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  areaRooms: { id: string; area: string; name: string; work_items?: { id: string; status: string; remarks?: string | null }[] | null }[];
}) {
  const [pageIndex, setPageIndex] = useState(0);

  // Calculate overall area progress across all rooms
  const allWorkItems = areaRooms.flatMap((r) => r.work_items ?? []);
  const overallAreaPct = progressOf(allWorkItems);

  // Show 5 room boxes per view (Page 1: 1-5, Page 2: 6-10, Page 3: 11-14)
  const pageSize = 5;
  const totalPages = Math.ceil(areaRooms.length / pageSize);
  const visibleRooms = areaRooms.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

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
          {/* Section Header: Overall Circular Progress & Pagination */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-3">
              <CircularProgress value={overallAreaPct} size={46} strokeWidth={5} />
              <div>
                <div className="text-sm font-semibold uppercase text-foreground">{area.label} Overall</div>
                <div className="text-xs text-muted-foreground">
                  Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, areaRooms.length)} of {areaRooms.length} rooms
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={pageIndex === 0}
                className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs hover:bg-accent text-muted-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous 5 rooms"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={pageIndex >= totalPages - 1}
                className="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs hover:bg-accent text-muted-foreground hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next 5 rooms"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clean Room Tab Boxes */}
          <div className="flex flex-wrap gap-3 py-1 overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {visibleRooms.map((room) => {
              const pct = progressOf(room.work_items ?? []);
              const colorInfo = getCircularColor(pct);
              return (
                <Link
                  key={room.id}
                  to="/area/$area"
                  params={{ area: area.slug }}
                  search={{ room: room.id }}
                  className={`flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent ${colorInfo.border} ${colorInfo.bg}`}
                >
                  <span className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}>
                    {pct}%
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-foreground whitespace-nowrap">
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
}

function DashboardPage() {
  const { isAdmin } = useAuth();
  const { data: settings } = useSettings();

  const { data: rawRooms = [], isLoading } = useQuery({
    queryKey: ["rooms-progress"],
    queryFn: async () => {
      await syncDashboardRooms();
      const { data, error } = await supabase
        .from("rooms")
        .select("id, area, name, sort_order, work_items(id, status, remarks)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <AppHeader subtitle={isAdmin ? "Admin main dashboard" : "Staff main dashboard"} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl uppercase font-display font-semibold">Overall progress</h1>
            <p className="text-sm text-muted-foreground">
              Tap an area to open the {isAdmin ? "detail view" : "update sheet"}, or tap a
              room to jump straight into it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {settings?.deadline && (
              <div className="flex items-center gap-3.5 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-surface px-4 py-2.5 shadow-sm">
                <div className="text-center min-w-[3.5rem]">
                  <div className="font-display text-3xl sm:text-4xl font-bold leading-none text-primary">
                    {daysLeft(settings.deadline)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mt-0.5">
                    {daysLeft(settings.deadline) === 1 ? "Day Left" : "Days Left"}
                  </div>
                </div>
                <div className="h-9 w-px bg-primary/20" />
                <div className="text-xs">
                  <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Deadline
                  </div>
                  <div className="font-medium text-foreground text-sm">
                    {new Date(settings.deadline + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            )}
            {isAdmin && <DeadlineSetting />}
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground p-4">Loading dashboard rooms…</p>}
          
          {AREAS.map((area) => {
            const areaRooms = getEffectiveAreaRooms(area.slug as AreaSlug, rawRooms);
            const allWorkItems = areaRooms.flatMap((r) => r.work_items ?? []);
            const overallAreaPct = progressOf(allWorkItems);

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
                        <div className="text-sm font-semibold uppercase text-foreground">{area.label} Overall</div>
                        <div className="text-xs text-muted-foreground">{areaRooms.length} room(s) total</div>
                      </div>
                    </div>

                    {/* Clean Room Tab Boxes */}
                    <div className="flex flex-wrap gap-3">
                      {areaRooms.map((room) => {
                        const pct = progressOf(room.work_items ?? []);
                        const colorInfo = getCircularColor(pct);
                        return (
                          <Link
                            key={room.id}
                            to="/area/$area"
                            params={{ area: area.slug }}
                            search={{ room: room.id }}
                            className={`flex min-w-[6.5rem] flex-col items-center justify-center rounded-xl border-2 bg-surface px-4 py-3 transition hover:scale-105 hover:bg-accent ${colorInfo.border} ${colorInfo.bg}`}
                          >
                            <span className={`font-display text-2xl font-bold leading-none ${colorInfo.text}`}>
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

      <IssueDock />
    </div>
  );
}


