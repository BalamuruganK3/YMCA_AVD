import smartClassImg from "@/assets/area-smart-class.jpg";
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

export type AreaSlug =
  | "smart_class"
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

export const DEFAULT_AREA_ROOMS: Record<AreaSlug, string[]> = {
  smart_class: Array.from({ length: 14 }, (_, i) => `Smart Class ${i + 1}`),
  lab: ["CS lab", "Bio lab", "Chem lab", "Phy lab", "stem lab"],
  staff_room: ["Staff Room"],
  control_room: ["Control Room"],
  library: ["Library"],
  entrance_corridor: ["Entrance Corridor"],
  principal_room: ["Principal Room"],
  admin_room: ["Admin Room"],
  record_store_room: ["Record Store Room"],
  medical_room: ["Medical Room"],
  pet_room: ["PET Room"],
  play_area: ["Play Area"],
};

export const AREAS: { slug: AreaSlug; label: string; image: string }[] = [
  { slug: "smart_class", label: "Smart Class", image: smartClassImg },
  { slug: "lab", label: "Lab", image: labImg },
  { slug: "staff_room", label: "Staff Room", image: staffRoomImg },
  { slug: "control_room", label: "Control Room", image: serverImg },
  { slug: "library", label: "Library", image: libraryImg },
  { slug: "entrance_corridor", label: "Entrance Corridor", image: entranceImg },
  { slug: "principal_room", label: "Principal Room", image: principalImg },
  { slug: "admin_room", label: "Admin Room", image: adminImg },
  { slug: "record_store_room", label: "Record Store Room", image: recordImg },
  { slug: "medical_room", label: "Medical Room", image: medicalImg },
  { slug: "pet_room", label: "PET Room", image: petImg },
  { slug: "play_area", label: "Play Area", image: playImg },
];

export function areaLabel(slug: string) {
  return AREAS.find((a) => a.slug === slug)?.label ?? slug;
}

export const WORK_STATUSES = ["hold", "in_progress", "completed", "issue"] as const;
export const MATERIAL_STATUSES = ["ordered", "received", "supplied", "installed"] as const;

export const STATUS_LABEL: Record<string, string> = {
  hold: "Hold",
  in_progress: "In-Progress",
  completed: "Completed",
  issue: "Issue",
  ordered: "Ordered",
  received: "Received",
  supplied: "Supplied",
  installed: "Installed",
};

/** How much a status contributes to the room completion percentage. */
const STATUS_WEIGHT: Record<string, number> = {
  hold: 0,
  issue: 0.25,
  in_progress: 0.5,
  completed: 1,
  ordered: 0.25,
  received: 0.5,
  supplied: 0.75,
  installed: 1,
};

export function getItemWeight(item: { status: string; remarks?: string | null }): number {
  if (item.remarks) {
    const match = item.remarks.match(/\[Range:\s*(\d+)%\]/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        return val / 100;
      }
    }
  }
  return STATUS_WEIGHT[item.status] ?? 0;
}

export function statusesFor(kind: string) {
  return kind === "material" ? [...MATERIAL_STATUSES] : [...WORK_STATUSES];
}

export function progressOf(items: { status: string; remarks?: string | null }[]) {
  if (!items.length) return 0;
  const sum = items.reduce((acc, i) => acc + getItemWeight(i), 0);
  return Math.round((sum / items.length) * 100);
}

export function getCircularColor(pct: number) {
  if (pct >= 100) return { stroke: "#22c55e", text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  if (pct >= 75) return { stroke: "#14b8a6", text: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/30" };
  if (pct >= 50) return { stroke: "#3b82f6", text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" };
  if (pct >= 25) return { stroke: "#f59e0b", text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  return { stroke: "#f43f5e", text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30" };
}

export function statusTone(status: string) {
  if (status === "completed" || status === "installed") return "done";
  if (status === "issue") return "issue";
  if (status === "hold") return "hold";
  return "progress";
}

export function getEffectiveAreaRooms<T extends { id: string; area: string; name: string }>(
  slug: AreaSlug,
  existingDbRooms: T[]
): T[] {
  const expectedNames = DEFAULT_AREA_ROOMS[slug] || [];
  const areaRooms = existingDbRooms.filter(
    (r) => r.area === slug && !["Staff Room 2", "Staff Room 3", "Staff Room 4", "Staff Room 5"].includes(r.name)
  );

  return expectedNames.map((name, index) => {
    const found = areaRooms.find((r) => r.name === name);
    if (found) return found;
    return {
      id: `virtual-${slug}-${index + 1}`,
      area: slug,
      name: name,
      work_items: [],
    } as unknown as T;
  });
}


