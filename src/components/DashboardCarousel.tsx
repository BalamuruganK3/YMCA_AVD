import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  MoveHorizontal,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AreaSlug, getAreaOverallProgress, collectAreaRooms } from "@/lib/constants";
import { type CatalogArea } from "@/lib/area-catalog";
import { CircularProgress } from "@/components/CircularProgress";

export type DashboardRoom = {
  id: string;
  area: string;
  name: string;
  sort_order?: number;
  work_items?: {
    id: string;
    title?: string;
    status: string;
    remarks?: string | null;
    updated_at?: string;
  }[] | null;
};

export type DashboardCard = {
  slug: string;
  label: string;
  image: string;
  sourceArea: string | null;
  rooms: DashboardRoom[];
  roomCount: number;
  firstRoomId: string;
  progress: number;
  updatedAt: string | null;
  latestRemark: string | null;
  counts: { done: number; active: number; pending: number; total: number; issues: number };
};

const DONE_STATUSES = new Set(["completed", "installed", "good", "count_high"]);
const ACTIVE_STATUSES = new Set([
  "in_progress",
  "ordered",
  "received",
  "supplied",
  "count_low",
]);

function cleanRemark(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\[Range:\s*\d+%\]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDashboardCards(
  areas: CatalogArea[],
  rawRooms: DashboardRoom[],
  fallbackUpdatedAt: string | null,
): DashboardCard[] {
  return areas
    .map((area) => {
      const rooms = collectAreaRooms(area.slug, area.sourceArea, rawRooms);
      if (rooms.length === 0) return null;

      let done = 0;
      let active = 0;
      let pending = 0;
      let issues = 0;
      let updatedAt = fallbackUpdatedAt;
      let latestRemark = "";
      let latestRemarkTime = 0;

      for (const room of rooms) {
        for (const item of room.work_items ?? []) {
          if (DONE_STATUSES.has(item.status)) done += 1;
          else if (ACTIVE_STATUSES.has(item.status)) active += 1;
          else pending += 1;
          if (item.status === "issue" || item.status === "damaged") issues += 1;

          if (item.updated_at) {
            const time = new Date(item.updated_at).getTime();
            if (!Number.isNaN(time) && (!updatedAt || time > new Date(updatedAt).getTime())) {
              updatedAt = item.updated_at;
            }
            const remark = cleanRemark(item.remarks);
            if (remark && time > latestRemarkTime) {
              latestRemark = remark;
              latestRemarkTime = time;
            }
          }
        }
      }

      const total = done + active + pending;
      return {
        slug: area.slug,
        label: area.label,
        image: area.image,
        sourceArea: area.sourceArea,
        rooms,
        roomCount: rooms.length,
        firstRoomId: rooms[0]?.id ?? "",
        progress: getAreaOverallProgress(area.slug as AreaSlug, rooms),
        updatedAt,
        latestRemark: latestRemark || null,
        counts: { done, active, pending, total, issues },
      } satisfies DashboardCard;
    })
    .filter((card): card is DashboardCard => Boolean(card));
}

function validDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null) {
  const date = validDate(value);
  if (!date) return "No update";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: string | null) {
  const date = validDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(value: string | null) {
  const date = validDate(value);
  if (!date) return "waiting for first update";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * 3 Circular Mini Progress Indicators with number and percentage INSIDE the rounded circle,
 * and label text OUTSIDE BELOW the circle.
 * Pure monochrome black, white, and grey with clear visual hierarchy.
 */
function MiniProgress({
  value,
  label,
  count,
  tone,
}: {
  value: number;
  label: string;
  count: number;
  tone: "bright" | "mid" | "soft";
}) {
  const size = 52;
  const stroke = 4.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  // Monochrome black, white, and grey hierarchy
  const strokeColor = tone === "bright" ? "#0f172a" : tone === "mid" ? "#475569" : "#94a3b8";
  const textColor = tone === "bright" ? "text-zinc-950 font-bold" : tone === "mid" ? "text-zinc-800 font-bold" : "text-zinc-600 font-semibold";

  return (
    <div className="flex min-w-0 flex-col items-center">
      {/* Circle with number & percentage INSIDE */}
      <div className="relative inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/70 shadow-neo-sm border border-white/90">
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center leading-none">
          <span className={`font-display text-[12px] tabular-nums ${textColor}`}>
            {value}%
          </span>
        </div>
      </div>
      {/* Label OUTSIDE BELOW the rounded circle */}
      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-zinc-600 shadow-xs border border-zinc-200/60">
        <span>{label}</span>
        <span className="text-zinc-900 font-extrabold">{count}</span>
      </span>
    </div>
  );
}

export function AreaCard({
  card,
  index = 0,
  onNavigate,
}: {
  card: DashboardCard;
  index?: number;
  onNavigate?: () => void;
}) {
  const { done, active, pending, total } = card.counts;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;
  const pendingPct = total ? Math.max(0, 100 - donePct - activePct) : 0;

  return (
    <Link
      to="/area/$area"
      params={{ area: card.slug }}
      search={{ room: card.firstRoomId }}
      onClick={onNavigate}
      data-card
      className="animate-neo-scale-in group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/90 bg-[#f0f3f6] shadow-neo transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_24px_rgba(166,175,195,0.55),-10px_-10px_24px_#d2d8e1]"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      aria-label={`Open ${card.label}, ${card.progress}% complete`}
    >
      {/* 1. TOP IMAGE with classroom/room type name inside image as currently having */}
      <div className="relative m-2.5 mb-0 aspect-[16/9] overflow-hidden rounded-[1.35rem] bg-zinc-200 shadow-xs">
        {card.image ? (
          <img
            src={card.image}
            alt={`${card.label} interior`}
            loading="lazy"
            width={1024}
            height={576}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-300" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* Live badge inside image top left */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          <span className="live-dot h-1.5 w-1.5 bg-white" />
          Live
        </div>

        {/* Circular progress inside image top right */}
        <div className="absolute right-3 top-2.5">
          <div className="rounded-full border border-white/20 bg-black/45 p-1 backdrop-blur-md">
            <CircularProgress value={card.progress} size={42} strokeWidth={3.5} />
          </div>
        </div>

        {/* Classroom name inside bottom of image */}
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <div className="flex items-end justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
                Room type
              </div>
              <h3 className="mt-0.5 truncate font-display text-[17px] font-bold leading-tight text-white drop-shadow-xs">
                {card.label}
              </h3>
            </div>
            <span className="shrink-0 rounded-full border border-white/20 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md shadow-xs">
              {card.roomCount} {card.roomCount === 1 ? "room" : "rooms"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BELOW IMAGE CONTENT */}
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        {/* Row 1: Left update date, Right last update time with icon time symbol */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-600">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">{formatDate(card.updatedAt)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{formatTime(card.updatedAt)}</span>
          </span>
        </div>

        {/* Row 2: Both below, add recent text to right side */}
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <p className="line-clamp-1 min-w-0 flex-1 text-[11.5px] leading-relaxed text-zinc-600">
            {card.latestRemark || "No recent note added for this room type."}
          </p>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-700 shadow-neo-sm border border-white/90">
            Recent
          </span>
        </div>

        <div className="my-3 h-px w-full bg-zinc-200/90" />

        {/* Row 3: 3 rounded circular mini progress (Done, Active, Pending) */}
        {/* Number & percentage INSIDE circle, text OUTSIDE BELOW the circle */}
        <div className="grid grid-cols-3 gap-2">
          <MiniProgress value={donePct} label="Done" count={done} tone="bright" />
          <MiniProgress value={activePct} label="Active" count={active} tone="mid" />
          <MiniProgress value={pendingPct} label="Pending" count={pending} tone="soft" />
        </div>

        {/* Row 4: Classroom progress bar below the 3 rounded mini progress */}
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Classroom progress
            </span>
            <span className="font-display text-[12.5px] font-bold tabular-nums text-zinc-950">
              {card.progress}%
            </span>
          </div>
          <div className="neo-progress-track">
            <div className="neo-progress-fill" style={{ width: `${card.progress}%` }} />
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-3.5 flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-600 transition-colors group-hover:text-zinc-950">
          <span className="truncate">
            {card.rooms.length > 1
              ? `${card.rooms[0]?.name ?? "Room"} +${card.rooms.length - 1} more`
              : card.rooms[0]?.name ?? "Open room"}
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-900 font-bold">
            Open
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ClassroomCarousel({
  cards,
  onViewAll,
}: {
  cards: DashboardCard[];
  onViewAll: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });
  const [scroll, setScroll] = useState({ progress: 0, canPrev: false, canNext: false });

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 4 ? Math.min(100, Math.max(0, (el.scrollLeft / max) * 100)) : 0;
    setScroll({
      progress,
      canPrev: el.scrollLeft > 4,
      canNext: max > 4 && el.scrollLeft < max - 4,
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, cards.length]);

  const step = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  const goToStart = () => {
    scrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      down: true,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.classList.add("is-dragging");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !dragRef.current.down) return;
    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 4) {
      dragRef.current.moved = true;
      el.scrollLeft = dragRef.current.scrollLeft - delta;
    }
  };

  const endDrag = () => {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current.down = false;
    el.classList.remove("is-dragging");
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 30);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <section id="classrooms" className="animate-neo-fade-up scroll-mt-32">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
            Classroom Overview
          </div>
          <h2 className="mt-1 font-display text-[22px] font-bold tracking-tight text-zinc-950 sm:text-[26px]">
            Classrooms at a glance
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">
            {cards.length} room {cards.length === 1 ? "type" : "types"} · swipe or drag to explore
            (displaying 2.5 cards per view).
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!scroll.canPrev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/70 text-zinc-800 shadow-neo-sm transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
            aria-label="Previous classrooms"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!scroll.canNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/70 text-zinc-800 shadow-neo-sm transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer"
            aria-label="Next classrooms"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onViewAll}
            className="ml-1 hidden h-10 items-center gap-1.5 rounded-full border border-white/90 bg-white/80 px-4 text-[12px] font-bold text-zinc-900 shadow-neo-sm transition hover:bg-white sm:inline-flex cursor-pointer"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Carousel showing 2 and a half cards */}
      <div
        ref={scrollerRef}
        className="neo-carousel mt-4 cursor-grab touch-pan-x active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        role="region"
        aria-roledescription="carousel"
        aria-label="Classroom summary cards"
      >
        {cards.map((card, index) => (
          <AreaCard key={card.slug} card={card} index={index} />
        ))}
        {cards.length === 0 && (
          <div className="neo-inset flex min-h-[20rem] w-full flex-col items-center justify-center rounded-[1.75rem] px-6 text-center">
            <Search className="h-6 w-6 text-zinc-400" />
            <p className="mt-3 font-display text-base font-bold text-zinc-800">No classrooms found</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              Try a different search query to see every classroom card.
            </p>
          </div>
        )}
      </div>

      {/* Main card bottom controls: progress and bottom right View All button */}
      <div className="mt-2 flex flex-col gap-3 border-t border-zinc-200/80 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MoveHorizontal className="h-4 w-4 shrink-0 text-zinc-500" />
          <div className="neo-progress-track w-full max-w-[14rem]">
            <div
              className="neo-progress-fill"
              style={{ width: `${cards.length > 1 ? Math.max(8, scroll.progress) : 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[10.5px] font-bold tabular-nums text-zinc-600">
            {Math.round(scroll.progress)}%
          </span>
          {scroll.progress > 2 ? (
            <button
              type="button"
              onClick={goToStart}
              className="shrink-0 text-[10.5px] font-bold text-zinc-600 underline-offset-4 transition hover:text-zinc-950 hover:underline cursor-pointer"
            >
              Back to start
            </button>
          ) : null}
        </div>

        {/* Next main card bottom right side View All button */}
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-[12.5px] font-bold text-white shadow-neo-sm transition hover:bg-black sm:self-auto cursor-pointer"
        >
          View all classrooms
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function AllClassroomsOverlay({
  open,
  onClose,
  cards,
  query,
  onQueryChange,
}: {
  open: boolean;
  onClose: () => void;
  cards: DashboardCard[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="All classrooms"
    >
      <div
        className="absolute inset-0 animate-overlay-in bg-black/45 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative flex h-full flex-col bg-[#f0f3f6] transition-all duration-300 ease-out ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.985] opacity-0"
        }`}
      >
        <div className="border-b border-zinc-200/90 bg-[#f0f3f6]/95 px-4 py-3.5 backdrop-blur-xl sm:px-8 sm:py-4.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                <span className="live-dot" />
                Full listing
              </div>
              <h2 className="mt-1 truncate font-display text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
                All Classrooms & Facilities
              </h2>
              <p className="mt-0.5 text-[12px] text-zinc-600">
                {cards.length} {cards.length === 1 ? "room type" : "room types"} · full screen view
              </p>
            </div>

            <div className="neo-inset order-last flex h-11 w-full items-center gap-2 rounded-full px-4 sm:order-none sm:w-72">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search all classrooms…"
                aria-label="Search all classrooms"
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {/* Close button with high polish */}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/80 text-zinc-700 shadow-neo-sm transition hover:bg-white hover:text-zinc-950 cursor-pointer"
              aria-label="Close all classrooms"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
            {cards.length === 0 ? (
              <div className="neo-inset mx-auto mt-10 flex max-w-md flex-col items-center rounded-[1.75rem] px-6 py-12 text-center">
                <Search className="h-7 w-7 text-zinc-400" />
                <p className="mt-3 font-display text-lg font-bold text-zinc-800">No matching classrooms</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Clear the search filter to display all classrooms.
                </p>
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  className="mt-4 rounded-full bg-zinc-950 px-5 py-2 text-[12px] font-bold text-white shadow-neo-sm hover:bg-black cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map((card, index) => (
                  <AreaCard key={card.slug} card={card} index={index} onNavigate={onClose} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-200/90 bg-[#f0f3f6]/95 px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-zinc-500 backdrop-blur-xl">
          Press Esc or click close button to exit
        </div>
      </div>
    </div>
  );
}
