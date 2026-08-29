import { supabase } from "@/integrations/supabase/client";
import { AREAS, AreaSlug, DEFAULT_AREA_ROOMS } from "@/lib/constants";
import { toAllCaps, toTitleCase } from "@/lib/utils";

export type AreaSettingRow = {
  area: string;
  label: string;
  image_url: string | null;
  source_area: string | null;
};

export type CatalogArea = {
  slug: string;
  label: string;
  image: string;
  sourceArea: string | null;
};

export function toAreaSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatAreaLabel(value: string): string {
  return toAllCaps(value.replace(/[-_]/g, " "));
}

export function formatRoomName(value: string): string {
  return toTitleCase(value);
}

export function roomCountLabel(count: number): string {
  return `${count} ${count === 1 ? "room" : "rooms"}`;
}

export function findExistingAreaSlug(
  input: string,
  rooms: { area: string }[],
  settings: AreaSettingRow[],
): string | null {
  const slug = toAreaSlug(input);
  const labelNorm = formatAreaLabel(input);
  const candidates = new Set<string>();
  for (const area of AREAS) {
    candidates.add(area.slug);
    if (toAreaSlug(area.label) === slug || formatAreaLabel(area.label) === labelNorm) {
      return area.slug;
    }
  }
  for (const row of settings) {
    candidates.add(row.area);
    if (row.area === slug || toAreaSlug(row.label) === slug || formatAreaLabel(row.label) === labelNorm) {
      return row.area;
    }
    if (row.source_area && (row.source_area === slug || toAreaSlug(row.source_area) === slug)) {
      return row.area;
    }
  }
  for (const room of rooms) {
    if (room.area === slug || toAreaSlug(room.area) === slug) return room.area;
  }
  for (const candidate of candidates) {
    if (candidate === slug) return candidate;
  }
  return null;
}

export function buildAreaCatalog(
  rooms: { area: string }[],
  settings: AreaSettingRow[],
): CatalogArea[] {
  const settingByArea = new Map(settings.map((row) => [row.area, row]));
  const settingBySource = new Map(
    settings.filter((row) => row.source_area).map((row) => [row.source_area as string, row]),
  );
  const known = new Set<string>();
  const result: CatalogArea[] = [];

  for (const area of AREAS) {
    const renamed = settingBySource.get(area.slug);
    const currentSlug = renamed?.area ?? area.slug;
    if (known.has(currentSlug)) continue;
    const overlay = settingByArea.get(currentSlug) ?? renamed;
    known.add(currentSlug);
    result.push({
      slug: currentSlug,
      label: overlay?.label || area.label,
      image: overlay?.image_url || area.image,
      sourceArea: overlay?.source_area ?? (renamed ? area.slug : null),
    });
  }

  const extraSlugs = Array.from(
    new Set(rooms.map((room) => room.area).filter((area) => area && !known.has(area))),
  );
  for (const slug of extraSlugs) {
    const overlay = settingByArea.get(slug);
    known.add(slug);
    result.push({
      slug,
      label: overlay?.label || formatAreaLabel(slug),
      image: overlay?.image_url || "",
      sourceArea: overlay?.source_area ?? null,
    });
  }

  return result;
}

export async function fetchAreaSettings(): Promise<AreaSettingRow[]> {
  const { data, error } = await supabase
    .from("area_settings")
    .select("area, label, image_url, source_area");
  if (error) throw error;
  return data ?? [];
}

export async function upsertAreaSetting(row: {
  area: string;
  label: string;
  image_url?: string | null;
  source_area?: string | null;
}) {
  const { data: existing } = await supabase
    .from("area_settings")
    .select("image_url, source_area")
    .eq("area", row.area)
    .maybeSingle();
  const { error } = await supabase.from("area_settings").upsert({
    area: row.area,
    label: formatAreaLabel(row.label),
    image_url: row.image_url !== undefined ? row.image_url : existing?.image_url ?? null,
    source_area: row.source_area !== undefined ? row.source_area : existing?.source_area ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message || "Could not save room type settings.");
}

export async function renameAreaInPlace(opts: {
  fromSlug: string;
  newLabel: string;
  rooms: { area: string }[];
  settings: AreaSettingRow[];
}): Promise<{ slug: string; label: string; merged: boolean }> {
  const label = formatAreaLabel(opts.newLabel);
  if (!label) throw new Error("Please enter a room type name.");
  const requestedSlug = toAreaSlug(label);
  if (!requestedSlug) throw new Error("Please enter a valid room type name.");

  const existing = findExistingAreaSlug(label, opts.rooms, opts.settings);
  const targetSlug = existing && existing !== opts.fromSlug ? existing : requestedSlug;
  const merged = Boolean(existing && existing !== opts.fromSlug);

  if (targetSlug !== opts.fromSlug) {
    const { error } = await supabase.from("rooms").update({ area: targetSlug }).eq("area", opts.fromSlug);
    if (error) throw new Error(error.message || "Could not rename this room type.");
  }

  const fromRow = opts.settings.find((row) => row.area === opts.fromSlug);
  const sourceArea = fromRow?.source_area ?? (AREAS.some((a) => a.slug === opts.fromSlug) ? opts.fromSlug : null);
  const keepImage = opts.settings.find((row) => row.area === targetSlug)?.image_url ?? fromRow?.image_url ?? null;

  if (opts.fromSlug !== targetSlug) {
    await supabase.from("area_settings").delete().eq("area", opts.fromSlug);
  }
  await upsertAreaSetting({
    area: targetSlug,
    label,
    image_url: keepImage,
    source_area: sourceArea && sourceArea !== targetSlug ? sourceArea : sourceArea,
  });

  return { slug: targetSlug, label, merged };
}

export function nextRoomNames(baseName: string, count: number, existingNames: string[]): string[] {
  const formatted = formatRoomName(baseName);
  if (count <= 1 && !existingNames.some((name) => name.toLowerCase() === formatted.toLowerCase())) {
    return [formatted];
  }

  const taken = new Set(existingNames.map((name) => name.toLowerCase()));
  const names: string[] = [];
  let n = 1;
  while (names.length < count) {
    const candidate = `${formatted} ${n}`;
    const plain = formatted;
    if (count === 1 && names.length === 0 && !taken.has(plain.toLowerCase())) {
      names.push(plain);
      break;
    }
    if (!taken.has(candidate.toLowerCase())) {
      names.push(candidate);
      taken.add(candidate.toLowerCase());
    }
    n += 1;
    if (n > 500) break;
  }
  return names;
}

export function retiredBuiltinSlugs(settings: AreaSettingRow[]): Set<string> {
  const retired = new Set<string>();
  for (const row of settings) {
    if (row.source_area && row.source_area !== row.area) retired.add(row.source_area);
  }
  return retired;
}

export function isBuiltinAreaSlug(slug: string): boolean {
  return AREAS.some((area) => area.slug === slug);
}

export { DEFAULT_AREA_ROOMS, type AreaSlug };
