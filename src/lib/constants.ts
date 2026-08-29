import classroomImg from "@/assets/area-smart-class.jpg";
import labImg from "@/assets/area-lab.jpg";
import staffRoomImg from "@/assets/area-staff-room.jpg";
import serverImg from "@/assets/area-server.jpg";

import adminImg from "@/assets/Admin.png";
import libraryImg from "@/assets/library.png";
import entranceImg from "@/assets/entrance.png";
import medicalImg from "@/assets/Medical.png";
import petImg from "@/assets/pet.png";
import playImg from "@/assets/Play.png";
import principalImg from "@/assets/Principal.png";
import recordImg from "@/assets/Record.png";
import { compareRoomNames } from "@/lib/utils";

export type AreaSlug =
  | "classroom"
  | "lab"
  | "staff_room"
  | "control_room"
  | "library"
  | "entrance_corridor"
  | "principal_room"
  | "admin_room"
  | "record_store_room"
  | "medical_room"
  | "pet_room"
  | "play_area";

export const CLASSROOM_NAMES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10 A",
  "10 B",
  "11 A",
  "11 B",
  "12 A",
  "12 B",
];

export const DEFAULT_AREA_ROOMS: Record<AreaSlug, string[]> = {
  classroom: CLASSROOM_NAMES,
  lab: ["CS lab", "Bio lab", "Chem lab", "Phy lab", "stem lab"],
  staff_room: ["Staff Room"],
  control_room: ["Server Room"],
  library: ["Library"],
  entrance_corridor: ["Entrance Corridor/Reciption"],
  principal_room: ["Principal Room"],
  admin_room: ["Admin Room"],
  record_store_room: ["Record Room"],
  medical_room: ["Medical Room"],
  pet_room: ["P.E.T Room"],
  play_area: ["Play Area"],
};

export const AREAS: { slug: AreaSlug; label: string; image: string }[] = [
  { slug: "classroom", label: "Classrooms", image: classroomImg },
  { slug: "lab", label: "Labs", image: labImg },
  { slug: "staff_room", label: "Staff Room", image: staffRoomImg },
  { slug: "control_room", label: "Server Room", image: serverImg },
  { slug: "library", label: "Library", image: libraryImg },
  { slug: "entrance_corridor", label: "Entrance Corridor/Reciption", image: entranceImg },
  { slug: "principal_room", label: "Principal Room", image: principalImg },
  { slug: "admin_room", label: "Admin Room", image: adminImg },
  { slug: "record_store_room", label: "Record Room", image: recordImg },
  { slug: "medical_room", label: "Medical Room", image: medicalImg },
  { slug: "pet_room", label: "P.E.T Room", image: petImg },
  { slug: "play_area", label: "Play Area", image: playImg },
];

export function areaLabel(slug: string) {
  return AREAS.find((a) => a.slug === slug)?.label ?? slug;
}

export const WORK_STATUSES = ["hold", "in_progress", "completed", "issue"] as const;
export const MATERIAL_STATUSES = ["ordered", "received", "supplied", "installed"] as const;
export const PRODUCT_STATUSES = ["good", "damaged", "count_high", "count_low"] as const;

export const STATUS_LABEL: Record<string, string> = {
  hold: "Hold",
  in_progress: "In-Progress",
  completed: "Completed",
  issue: "Issue",
  ordered: "Ordered",
  received: "Received",
  supplied: "Supplied",
  installed: "Installed",
  good: "Product Good",
  damaged: "Product Damaged",
  count_high: "Count High",
  count_low: "Count Low",
};

/** How much a status contributes to the room completion percentage. */
const STATUS_WEIGHT: Record<string, number> = {
  hold: 0,
  issue: 0,
  in_progress: 0.5,
  completed: 1,
  ordered: 0.25,
  received: 0.5,
  supplied: 0.75,
  installed: 1,
  good: 1,
  damaged: 0,
  count_high: 1,
  count_low: 0.5,
};

export function getItemWeight(item: { status: string; remarks?: string | null }): number {
  const status = item.status;
  if (status === "hold" || status === "issue" || status === "damaged") return 0;
  if (status === "completed" || status === "installed" || status === "good" || status === "count_high") return 1;

  if (item.remarks) {
    const match = item.remarks.match(/\[Range:\s*(\d+)%\]/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        return val / 100;
      }
    }
  }
  return STATUS_WEIGHT[status] ?? 0;
}

export function statusesFor(kind: string) {
  if (kind === "material") return [...MATERIAL_STATUSES];
  if (kind === "product") return [...PRODUCT_STATUSES];
  return [...WORK_STATUSES];
}

import { getRoomDefaultWorkItems } from "./room-tasks";

export function getRoomProgress(
  room: { name: string; work_items?: { status: string; remarks?: string | null; title?: string }[] | null },
  areaSlug: AreaSlug,
): number {
  const defaultTasks = getRoomDefaultWorkItems(areaSlug, room.name);
  const dbItems = room.work_items ?? [];
  if (dbItems.length === 0) return 0;

  const taskCount = defaultTasks.length || dbItems.length;
  if (!taskCount) return 0;

  let sumWeight = 0;
  let matchedAny = false;
  for (const defaultTask of defaultTasks) {
    const matched = dbItems.find(
      (item) => (item.title || "").toLowerCase() === defaultTask.title.toLowerCase(),
    );
    if (matched) {
      matchedAny = true;
      sumWeight += getItemWeight(matched);
    }
  }

  if (!matchedAny) {
    const sumAll = dbItems.reduce((acc, i) => acc + getItemWeight(i), 0);
    return Math.min(100, Math.round((sumAll / dbItems.length) * 100));
  }

  return Math.min(100, Math.round((sumWeight / taskCount) * 100));
}

export function getAreaOverallProgress(areaSlug: AreaSlug, areaRooms: any[]): number {
  if (!areaRooms || !areaRooms.length) return 0;
  const roomProgressList = areaRooms.map((room) => getRoomProgress(room, areaSlug));
  const totalSum = roomProgressList.reduce((acc, pct) => acc + pct, 0);
  return Math.round(totalSum / areaRooms.length);
}

export function progressOf(items: { status: string; remarks?: string | null }[]) {
  if (!items.length) return 0;
  const sum = items.reduce((acc, i) => acc + getItemWeight(i), 0);
  return Math.round((sum / items.length) * 100);
}

export function getCircularColor(pct: number) {
  if (pct >= 100)
    return {
      stroke: "#22c55e",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    };
  if (pct >= 75)
    return {
      stroke: "#14b8a6",
      text: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
    };
  if (pct >= 50)
    return {
      stroke: "#3b82f6",
      text: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
    };
  if (pct >= 25)
    return {
      stroke: "#f59e0b",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    };
  return {
    stroke: "#f43f5e",
    text: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  };
}

export function isItemManuallyOnHold(item: { status: string; remarks?: string | null }): boolean {
  if (item.status !== "hold") return false;
  const clean = (item.remarks ?? "").replace(/\[Range:\s*\d+%\]\s*/i, "").trim();
  return clean.length > 0;
}

export function getItemDisplayStatus(
  item: { status: string; remarks?: string | null },
  isAdmin?: boolean,
): string {
  if (item.status === "hold") {
    if (isItemManuallyOnHold(item)) {
      return "Hold";
    }
    return "Initiated";
  }
  if (item.status === "issue" && isAdmin) {
    return "Hold";
  }
  return STATUS_LABEL[item.status] ?? item.status;
}

export function getItemStatusTone(
  item: { status: string; remarks?: string | null },
  isAdmin?: boolean,
): string {
  if (item.status === "completed" || item.status === "installed" || item.status === "good" || item.status === "count_high")
    return "done";
  if (item.status === "issue" || item.status === "damaged") {
    return isAdmin ? "hold" : "issue";
  }
  if (item.status === "hold") {
    return isItemManuallyOnHold(item) ? "hold" : "initiated";
  }
  return "progress";
}

export function statusTone(status: string) {
  if (status === "completed" || status === "installed" || status === "good" || status === "count_high") return "done";
  if (status === "issue" || status === "damaged") return "issue";
  if (status === "hold" || status === "count_low") return "hold";
  return "progress";
}

export function getEffectiveAreaRooms<T extends { id: string; area: string; name: string }>(
  slug: AreaSlug,
  existingDbRooms: T[],
): T[] {
  const expectedNames = DEFAULT_AREA_ROOMS[slug] || [];
  const areaRooms = existingDbRooms.filter((r) => r.area === slug);

  const byName = new Map(areaRooms.map((r) => [r.name, r]));
  const result: T[] = [];

  // Real default rooms first. Deleted rooms stay gone — do not inject placeholders.
  for (const name of expectedNames) {
    const found = byName.get(name);
    if (found) {
      result.push(found);
      byName.delete(name);
    }
  }

  // Extra staff-created rooms for this type, in class order (1–9, 10 A, 10 B, …).
  const extras: T[] = [];
  for (const room of areaRooms) {
    if (byName.has(room.name)) extras.push(room);
  }
  extras.sort((a, b) => compareRoomNames(a.name, b.name));

  return [...result, ...extras];
}
