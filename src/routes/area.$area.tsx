import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Images,
  X,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebp, assertPhotoSize, workPhotoThumbUrl, workPhotoOpenUrl, formatPhotoDate, uploadWorkPhotoWebp } from "@/lib/photo-upload";
import { saveWorkItemStatusClient } from "@/lib/save-work-item";
import { AppHeader, useSettings, daysLeft } from "@/components/AppHeader";
import { IssueDock } from "@/components/IssueDock";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/useAuth";
import {
  areaLabel,
  getRoomProgress,
  statusesFor,
  STATUS_LABEL,
  statusTone,
  getItemDisplayStatus,
  getItemStatusTone,
  getEffectiveAreaRooms,
  AreaSlug,
  AREAS,
  getItemWeight,
} from "@/lib/constants";
import { getRoomDefaultWorkItems } from "@/lib/room-tasks";
import { toAllCaps, toTitleCase } from "@/lib/utils";
import { formatAreaLabel, formatRoomName } from "@/lib/area-catalog";
import {
  OVERALL_REMARKS_TITLE,
  deleteRoomPermanently,
  fetchRoomsWithRemarks,
  isOverallRemarksItem,
  saveOverallRoomRemarks,
} from "@/lib/room-remarks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularProgress } from "@/components/CircularProgress";
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

export const Route = createFileRoute("/area/$area")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search["room"] === "string" ? (search["room"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Room Works — AV DYNAMICS PRIVATE LIMITED" },
      {
        name: "description",
        content:
          "Room-by-room work status, task details, staff remarks and site photos for the facility fit-out.",
      },
      { property: "og:title", content: "Room Works — AV DYNAMICS PRIVATE LIMITED" },
      {
        property: "og:description",
        content: "Room-by-room work status, remarks and site photos.",
      },
    ],
  }),
  component: AreaPage,
});

const toneClass: Record<string, string> = {
  done: "border-status-done bg-status-done/15 text-status-done",
  progress: "border-status-progress bg-status-progress/15 text-status-progress",
  issue: "border-red-600 bg-red-600 text-white font-semibold hover:bg-red-700",
  hold: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  initiated: "border-sky-500/30 bg-sky-500/10 text-sky-400",
};

interface StatusPromptState {
  item: { id: string; title: string; kind: string; status: string; remarks: string | null };
  targetStatus: string;
}

function AreaPage() {
  const { area } = Route.useParams();
  const { room: roomParam } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const isViewer = !isStaff;
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Modal dialog state for status updates & range fixing
  const [promptState, setPromptState] = useState<StatusPromptState | null>(null);
  const [promptRange, setPromptRange] = useState<number>(50);
  const [promptRemarks, setPromptRemarks] = useState<string>("");

  // Confirmation step before saving an update
  const [confirmState, setConfirmState] = useState<{
    item: { id: string; title: string };
    targetStatus: string;
    formattedRemarks: string;
  } | null>(null);

  // Add new work item dialog state (Req 4)
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    group_name: "",
    subgroup: "",
    kind: "work" as "work" | "material" | "product",
    quantity: 1,
  });
  const [addMode, setAddMode] = useState<"work" | "product">("work");
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmRemarks, setConfirmRemarks] = useState<"save" | "clear" | null>(null);
  // Which mode each field is in: a predefined value, or "" = "Others…" (custom input)
  const [headingPick, setHeadingPick] = useState("");
  const [subheadingPick, setSubheadingPick] = useState("");
  const [workPick, setWorkPick] = useState("");
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editRoomName, setEditRoomName] = useState("");
  const [editTasks, setEditTasks] = useState<
    { id: string; group_name: string; subgroup: string; title: string }[]
  >([]);

  // Fullscreen Lightbox Modal state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    id: string;
    file_name: string;
    drive_file_id?: string | null;
    drive_view_url?: string | null;
    drive_thumbnail_url?: string | null;
    created_at?: string;
  } | null>(null);

  const { data: rawRooms = [] } = useQuery({
    queryKey: ["rooms", area],
    queryFn: fetchRoomsWithRemarks,
    refetchInterval: isViewer ? 60_000 : 30_000,
    refetchIntervalInBackground: true,
  });

  const { data: areaSetting } = useQuery({
    queryKey: ["area-settings", area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("area_settings")
        .select("area, label, image_url, source_area")
        .eq("area", area)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const currentTypeLabel = areaSetting?.label || formatAreaLabel(areaLabel(area));

  const rooms = getEffectiveAreaRooms(area as AreaSlug, rawRooms);

  const roomId = roomParam || rooms[0]?.id || "";
  const roomName = rooms.find((r) => r.id === roomId)?.name ?? "";

  // Overall room remarks (whole-room note) state
  const currentRoom = rawRooms.find((r) => r.id === roomId);
  const [roomRemarks, setRoomRemarks] = useState<string>("");

  const saveRoomRemarks = useMutation({
    mutationFn: async (text: string) => {
      if (!roomId || roomId.startsWith("virtual-")) {
        throw new Error("Please open a real room before saving the overall remark.");
      }
      await saveOverallRoomRemarks(roomId, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", area] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["work-items", roomId] });
      toast.success(roomRemarks.trim() ? "Issue text is held for this room." : "Held issue text removed.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete the whole room (Req 2) with a two-step "secondary" confirmation.
  const [roomDeleting, setRoomDeleting] = useState<{ id: string; name: string; confirmed: boolean } | null>(null);
  const [confirmRoomName, setConfirmRoomName] = useState("");
  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRoomPermanently(id);
      const isBuiltinType = AREAS.some((a) => a.slug === result.area);
      return {
        ...result,
        roomTypeLabel: areaLabel(result.area),
        typeRemoved: result.typeRemoved && !isBuiltinType,
      };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", area] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
      queryClient.invalidateQueries({ queryKey: ["custom-areas"] });
      setRoomDeleting(null);
      setConfirmRoomName("");
      if (res.typeRemoved) {
        toast.success(`Room "${res.name}" deleted. The entire "${res.roomTypeLabel}" room type was removed.`);
        navigate({ to: "/", replace: true });
      } else {
        toast.success(`Room "${res.name}" deleted permanently.`);
        navigate({ to: "/area/$area", params: { area }, search: { room: "" }, replace: true });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Keep the overall room remark textarea in sync with the selected room.
  useEffect(() => {
    setRoomRemarks(currentRoom?.remarks ?? "");
  }, [currentRoom?.remarks, roomId]);

  const { data: items = [] } = useQuery({
    queryKey: ["work-items", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_items")
        .select("id, group_name, subgroup, title, kind, status, remarks, quantity, updated_at")
        .eq("room_id", roomId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).filter((item) => !isOverallRemarksItem(item));
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const { data: workSuggestionRows = [] } = useQuery({
    queryKey: ["work-suggestions", area],
    queryFn: async () => {
      const { data: areaRooms, error: roomsErr } = await supabase
        .from("rooms")
        .select("id")
        .eq("area", area);
      if (roomsErr) throw roomsErr;
      const ids = (areaRooms ?? []).map((r) => r.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("work_items")
        .select("group_name, subgroup, title")
        .in("room_id", ids);
      if (error) throw error;
      return (data ?? []).filter((d) => !isOverallRemarksItem(d));
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_photos")
        .select("id, file_name, drive_file_id, drive_view_url, drive_thumbnail_url, work_item_id, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });

  // Handle keyboard navigation for lightbox (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!lightboxPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (photos.length <= 1) return;
        const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex !== -1) {
          const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
          setLightboxPhoto(photos[prevIndex] ?? null);
        }
      } else if (e.key === "ArrowRight") {
        if (photos.length <= 1) return;
        const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % photos.length;
          setLightboxPhoto(photos[nextIndex] ?? null);
        }
      } else if (e.key === "Escape") {
        setLightboxPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxPhoto, photos]);

  const displayItems = useMemo(() => {
    if (items.length > 0) return items;
    // Only seed a virtual template for rooms that are not saved yet.
    // A real room with zero works stays empty so delete does not reverse itself.
    if (!roomId || !roomId.startsWith("virtual-")) return [];
    const isBuiltinArea = AREAS.some((a) => a.slug === area);
    if (!isBuiltinArea) return [];
    const defaults = getRoomDefaultWorkItems(area as AreaSlug, roomName);
    return defaults.map((d, i) => ({
      id: `virtual-item-${i}`,
      group_name: d.group_name,
      subgroup: d.subgroup,
      title: d.title,
      kind: d.kind,
      status: "hold",
      remarks: null,
      quantity: 0,
      updated_at: new Date().toISOString(),
    }));
  }, [items, area, roomName, roomId]);

  const catalogRows = useMemo(() => {
    return [
      ...workSuggestionRows,
      ...displayItems.map((item) => ({
        group_name: item.group_name,
        subgroup: item.subgroup,
        title: item.title,
      })),
    ];
  }, [workSuggestionRows, displayItems]);

  const headingOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogRows.map((row) => toAllCaps(String(row.group_name ?? ""))).filter(Boolean)),
      ).sort(),
    [catalogRows],
  );

  const selectedHeading = toAllCaps(newItem.group_name);
  const selectedSubheading = toTitleCase(newItem.subgroup);

  const subheadingOptions = useMemo(
    () =>
      Array.from(
        new Set(
          catalogRows
            .filter((row) => toAllCaps(String(row.group_name ?? "")) === selectedHeading)
            .map((row) => toTitleCase(String(row.subgroup ?? "")))
            .filter(Boolean),
        ),
      ).sort(),
    [catalogRows, selectedHeading],
  );

  const workOptions = useMemo(
    () =>
      Array.from(
        new Set(
          catalogRows
            .filter(
              (row) =>
                toAllCaps(String(row.group_name ?? "")) === selectedHeading &&
                toTitleCase(String(row.subgroup ?? "")) === selectedSubheading,
            )
            .map((row) => toTitleCase(String(row.title ?? "")))
            .filter(Boolean),
        ),
      ).sort(),
    [catalogRows, selectedHeading, selectedSubheading],
  );

  const grouped = useMemo(() => {
    const headingMap = new Map<string, Map<string, typeof displayItems>>();
    for (const item of displayItems) {
      const heading = toAllCaps(item.group_name) || "OTHER";
      const sub = toTitleCase(item.subgroup ?? "");
      const subs = headingMap.get(heading) ?? new Map<string, typeof displayItems>();
      const list = subs.get(sub) ?? [];
      list.push(item);
      subs.set(sub, list);
      headingMap.set(heading, subs);
    }
    return [...headingMap.entries()].map(([heading, subs]) => [heading, [...subs.entries()]] as const);
  }, [displayItems]);

  const saveStatus = useMutation({
    mutationFn: async (input: {
      id: string;
      status: string;
      remarks?: string | null;
      title?: string;
    }) => {
      if (!user) throw new Error("Please log in as staff to make updates.");

      const itemTitle = input.title || displayItems.find((i) => i.id === input.id)?.title || "";
      const currentArea = area as AreaSlug;
      const currentRoomName = roomName || rooms[0]?.name || "Room 1";

      const result = await saveWorkItemStatusClient({
        userId: user.id,
        area: currentArea,
        roomName: currentRoomName,
        itemId: input.id,
        itemTitle,
        status: input.status,
        remarks: input.remarks ?? null,
      });

      if (result?.roomId && (roomId.startsWith("virtual-") || roomId !== result.roomId)) {
        navigate({ to: "/area/$area", params: { area }, search: { room: result.roomId } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["last-data-updated"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["photos", roomId] });
      toast.success("Work update saved successfully!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openStatusPrompt = (
    item: { id: string; title: string; kind: string; status: string; remarks: string | null },
    targetStatus: string,
  ) => {
    const currentWeightPct = Math.round(getItemWeight(item) * 100);

    let defaultRange = currentWeightPct;
    if (targetStatus === "completed" || targetStatus === "installed") defaultRange = 100;
    else if (targetStatus === "supplied") defaultRange = 75;
    else if (targetStatus === "in_progress" || targetStatus === "received")
      defaultRange = currentWeightPct > 0 ? currentWeightPct : 50;
    else if (targetStatus === "ordered" || targetStatus === "issue") defaultRange = 25;
    else if (targetStatus === "hold") defaultRange = 0;

    // Clean existing remarks (stripping old [Range: X%])
    const cleanRemarks = (item.remarks ?? "").replace(/\[Range:\s*\d+%\]\s*/i, "").trim();

    setPromptState({ item, targetStatus });
    setPromptRange(defaultRange);
    setPromptRemarks(cleanRemarks);
  };

  const handlePromptSave = () => {
    if (!promptState) return;
    const { item, targetStatus } = promptState;

    if (!promptRemarks.trim()) {
      toast.error(`Please enter remarks before saving ${STATUS_LABEL[targetStatus] || targetStatus}.`);
      return;
    }

    const formattedRemarks =
      targetStatus === "hold" || targetStatus === "issue"
        ? promptRemarks.trim()
        : `[Range: ${promptRange}%] ${promptRemarks.trim()}`;

    setConfirmState({ item, targetStatus, formattedRemarks });
  };

  const handleConfirmSave = () => {
    if (!confirmState) return;
    const { item, targetStatus, formattedRemarks } = confirmState;
    saveStatus.mutate({
      id: item.id,
      status: targetStatus,
      remarks: formattedRemarks,
    });
    setConfirmState(null);
    setPromptState(null);
  };

  // Add a brand new work item to the current room (Req 4)
  const addWorkItem = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in as staff to add a work item.");
      if (roomId.startsWith("virtual-")) {
        throw new Error("Please open a saved room before adding a work item.");
      }
      const title = toTitleCase(newItem.title);
      const groupName = toAllCaps(newItem.group_name);
      const subgroup = toTitleCase(newItem.subgroup);
      if (!groupName) throw new Error("Main Heading is required.");
      if (!title) throw new Error("Work / Task is required.");
      const qty = Math.max(0, Math.floor(Number(newItem.quantity) || 0));

      const sameHeading = displayItems.filter((item) => toAllCaps(item.group_name) === groupName);
      const storedHeading = sameHeading[0]?.group_name ?? groupName;
      const sameSub = sameHeading.filter((item) => toTitleCase(item.subgroup ?? "") === subgroup);
      const storedSub = subgroup ? (sameSub[0]?.subgroup ?? subgroup) : (sameSub[0]?.subgroup ?? null);

      const existing = sameSub.find((item) => toTitleCase(item.title) === title);
      if (existing && !existing.id.startsWith("virtual-")) {
        if (newItem.kind === "product" || existing.kind === "product") {
          const nextQty = (existing.quantity ?? 0) + (qty || 1);
          const { error } = await supabase
            .from("work_items")
            .update({
              quantity: nextQty,
              kind: "product",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw error;
          return { merged: true, nested: true };
        }
        throw new Error("This heading, subheading and work already exist in this room.");
      }

      const nextItems = displayItems.length + 1;
      const { data, error } = await supabase
        .from("work_items")
        .insert({
          room_id: roomId,
          group_name: storedHeading,
          subgroup: storedSub,
          title,
          kind: newItem.kind,
          status: newItem.kind === "product" ? "good" : "hold",
          quantity: newItem.kind === "product" ? qty || 1 : 0,
          sort_order: nextItems,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { merged: false, nested: sameHeading.length > 0, data };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", area] });
      queryClient.invalidateQueries({ queryKey: ["work-suggestions", area] });
      setAddItemOpen(false);
      setConfirmAdd(false);
      setNewItem({ title: "", group_name: "", subgroup: "", kind: "work", quantity: 1 });
      toast.success(
        res.merged
          ? "Added to the existing task."
          : res.nested
            ? "Added under the existing heading."
            : "New item added.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveRoomAndTasks = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in as staff to edit this room.");
      if (!roomId || roomId.startsWith("virtual-")) {
        throw new Error("Please open a saved room before editing.");
      }
      const nextName = formatRoomName(editRoomName);
      if (!nextName) throw new Error("Room name is required.");
      const nameTaken = rooms.some(
        (room) => room.id !== roomId && formatRoomName(room.name) === nextName,
      );
      if (nameTaken) throw new Error("A room with this name already exists in this type.");

      const { error: roomErr } = await supabase.from("rooms").update({ name: nextName }).eq("id", roomId);
      if (roomErr) throw roomErr;

      for (const task of editTasks) {
        const groupName = toAllCaps(task.group_name);
        const subgroup = toTitleCase(task.subgroup);
        const title = toTitleCase(task.title);
        if (!groupName || !title) {
          throw new Error("Every task needs a heading and work. Subheading can be left blank.");
        }
        const { error } = await supabase
          .from("work_items")
          .update({
            group_name: groupName,
            subgroup: subgroup || null,
            title,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", area] });
      queryClient.invalidateQueries({ queryKey: ["work-suggestions", area] });
      setEditRoomOpen(false);
      toast.success("Room and tasks updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete a single work item (Req 3) with confirmation
  const [deleteItem, setDeleteItem] = useState<{ id: string; title: string } | null>(null);
  const deleteWorkItem = useMutation({
    mutationFn: async (id: string) => {
      // Delete related photos/updates first (FK-safe), then the item itself.
      const { data: itemRow } = await supabase
        .from("work_items")
        .select("room_id")
        .eq("id", id)
        .maybeSingle();
      const roomId = itemRow?.room_id ?? null;

      await supabase.from("work_photos").delete().eq("work_item_id", id);
      await supabase.from("work_updates").delete().eq("work_item_id", id);
      const { error } = await supabase.from("work_items").delete().eq("id", id);
      if (error) throw error;

      let roomDeleted = false;
      let typeRemoved = false;
      let roomTypeLabel = "";
      if (roomId) {
        const { count } = await supabase
          .from("work_items")
          .select("id", { count: "exact", head: true })
          .eq("room_id", roomId)
          .neq("title", OVERALL_REMARKS_TITLE);
        if ((count ?? 0) === 0) {
          const result = await deleteRoomPermanently(roomId);
          roomDeleted = true;
          const isBuiltinType = AREAS.some((a) => a.slug === result.area);
          typeRemoved = result.typeRemoved && !isBuiltinType;
          roomTypeLabel = areaLabel(result.area);
        }
      }
      return { roomDeleted, typeRemoved, roomTypeLabel };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", area] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["custom-areas"] });
      setDeleteItem(null);
      if (res.typeRemoved) {
        toast.success(`Last task deleted — the room and "${res.roomTypeLabel}" room type were removed.`);
        navigate({ to: "/", replace: true });
      } else if (res.roomDeleted) {
        toast.success("Last task deleted — the room was removed permanently.");
        navigate({ to: "/area/$area", params: { area }, search: { room: "" }, replace: true });
      } else {
        toast.success("Work item deleted.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onPickFile = async (file: File) => {
    if (!roomId || roomId.startsWith("virtual-")) {
      toast.error("Please open a saved room before adding a photo.");
      return;
    }
    if (!user) {
      toast.error("Please log in as staff to upload photos.");
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 10 MB limit. Please select a photo under 10 MB.");
      return;
    }
    try {
      assertPhotoSize(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid photo.");
      return;
    }

    let dbWorkItemId = photoTarget;
    if (!dbWorkItemId) {
      toast.error("Use + Photo on a task to attach a photo.");
      return;
    }
    if (photoTarget?.startsWith("virtual-")) {
      const selectedTask = displayItems.find((i) => i.id === photoTarget);
      if (selectedTask) {
        const { data: realItem } = await supabase
          .from("work_items")
          .select("id")
          .eq("room_id", roomId)
          .eq("title", selectedTask.title)
          .maybeSingle();
        if (realItem) dbWorkItemId = realItem.id;
      }
    }
    if (!dbWorkItemId || dbWorkItemId.startsWith("virtual-")) {
      toast.error("This task is not saved yet. Try again after the room loads.");
      return;
    }

    setUploading(true);
    try {
      const webp = await convertImageToWebp(file);
      await uploadWorkPhotoWebp({
        roomId,
        workItemId: dbWorkItemId,
        userId: user.id,
        originalName: file.name,
        blob: webp,
      });
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["photos", roomId] });
      toast.success("Photo saved. The link is stored in Supabase.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setPhotoTarget(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const { data: settings } = useSettings();
  const targetDeadline = settings?.deadline || "2026-04-15";
  const selected = displayItems.find((i) => i.id === selectedItem) ?? null;
  const pct = getRoomProgress({ name: roomName, work_items: displayItems }, area as AreaSlug);
  const taskPhotos = photos.filter((p) => !!p.work_item_id);
  // True when the current room is the only one left in a custom (non built-in) area,
  // so deleting it also removes the entire room type / tab permanently.
  const lastRoomInCustomArea =
    !!currentRoom &&
    !roomId.startsWith("virtual-") &&
    !AREAS.some((a) => a.slug === currentRoom.area) &&
    rawRooms.filter((r) => r.area === currentRoom.area).length <= 1;

  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Higher Secondary School" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border-2 border-white bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Main dashboard</span>
            </Link>
          </Button>
          <div className="flex h-12 w-[8rem] min-w-[8rem] items-center justify-center rounded-xl bg-surface px-3">
            <span className="truncate font-display text-base uppercase font-bold leading-tight">{currentTypeLabel}</span>
          </div>
          {rooms.length > 1 ? (
            <div className="flex h-12 w-[12.5rem] min-w-[12.5rem] items-center rounded-xl border-2 border-white bg-surface px-2">
              <Select
                value={roomId || "select"}
                onValueChange={(value) => {
                  if (value && value !== "select") {
                    navigate({ to: "/area/$area", params: { area }, search: { room: value } });
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full border-0 bg-transparent px-1 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex h-12 w-[12.5rem] min-w-[12.5rem] items-center justify-center rounded-xl border-2 border-white bg-surface px-3">
              <span className="truncate font-medium leading-none">{roomName || rooms[0]?.name || "—"}</span>
            </div>
          )}

          <div className="flex h-12 w-[12.5rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-lg bg-surface px-3">
            <CircularProgress value={pct} size={30} strokeWidth={2} />
            <span className="text-[11px] font-semibold uppercase text-muted-foreground leading-tight">
              Room Progress
            </span>
          </div>

         {/* {targetDeadline && (
            <div className="flex h-12 w-[12.5rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-xl border-2 border-white bg-surface px-3">
              <span className="font-display text-lg font-bold text-primary leading-none">
                {daysLeft(targetDeadline)}
              </span>
              <span className="text-[11px] uppercase font-bold text-primary/80 tracking-wider leading-tight">
                {daysLeft(targetDeadline) = : "Days Left"}
              </span>
            </div>
          )}
*/}
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:ml-auto justify-start sm:justify-end">
            <IssueDock />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Images className="mr-1 h-4 w-4" /> Overall photos ({taskPhotos.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Photos uploaded for {roomName}</DialogTitle>
                </DialogHeader>
                {taskPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {taskPhotos.map((photo) => (
                      <li
                        key={photo.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {workPhotoThumbUrl(photo) && (
                            <img
                              src={workPhotoThumbUrl(photo)}
                              alt=""
                              className="h-9 w-9 rounded object-cover cursor-pointer"
                              onClick={() => setLightboxPhoto(photo)}
                            />
                          )}
                          <div className="min-w-0">
                            <span
                              className="block truncate text-sm font-medium hover:text-primary cursor-pointer"
                              onClick={() => setLightboxPhoto(photo)}
                            >
                              {photo.file_name}
                            </span>
                            {photo.created_at && (
                              <span className="block text-[11px] text-muted-foreground">
                                {formatPhotoDate(photo.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(photo)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium"
                          >
                            View
                          </button>
                          {workPhotoOpenUrl(photo) && (
                            <a
                              className="text-xs text-primary hover:underline"
                              href={workPhotoOpenUrl(photo)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="panel space-y-5 p-5">
            {grouped.map(([group, subgroups]) => (
              <div key={group} className="space-y-3">
                <h2 className="text-xl uppercase text-primary font-display font-semibold">
                  {group}
                </h2>
                {subgroups.map(([sub, groupItems]) => (
                  <div key={`${group}-${sub || "none"}`} className="space-y-3">
                    {sub ? (
                      <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                        {sub}
                      </div>
                    ) : null}
                    {groupItems.map((item) => {
                  const itemPhotos = photos.filter((p) => p.work_item_id === item.id);
                  const displayStatus = getItemDisplayStatus(item, isViewer);
                  const displayTone = getItemStatusTone(item, isViewer);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item.id);
                        setRemarks(item.remarks ?? "");
                      }}
                      className={`cursor-pointer rounded-lg border p-3 transition ${selectedItem === item.id
                        ? "border-primary shadow-xs bg-accent/20"
                        : "border-border hover:border-border/80"
                        }`}
                    >
                      <div className="font-medium text-foreground">
                        {item.title}
                        {item.kind === "product" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            · Count {item.quantity ?? 0}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {statusesFor(item.kind).map((status) => {
                          const active = item.status === status;
                          if (isViewer) {
                            return active ? (
                              <span
                                key={status}
                                className={`rounded-md border px-3 py-1 text-sm font-semibold ${toneClass[displayTone] || toneClass[statusTone(status)]}`}
                              >
                                {displayStatus}
                              </span>
                            ) : null;
                          }
                          return (
                            <button
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item.id);
                                openStatusPrompt(item, status);
                              }}
                              className={`rounded-md border px-3 py-1 text-sm transition hover:border-primary ${active
                                ? toneClass[statusTone(status)]
                                : "border-border text-muted-foreground"
                                }`}
                            >
                              {STATUS_LABEL[status]}
                            </button>
                          );
                        })}
                        {!isViewer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoTarget(item.id);
                              fileInput.current?.click();
                            }}
                            className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
                            title="Add photo for this task"
                          >
                            + Photo
                          </button>
                        )}
                        {/* Display Uploaded Task Photos Inline */}
                        {itemPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxPhoto(photo);
                            }}
                            className="group/photo relative h-8 w-8 overflow-hidden rounded border border-border bg-surface transition hover:scale-105 hover:border-primary cursor-pointer shadow-xs"
                            title={`${photo.file_name}${photo.created_at ? ` · ${formatPhotoDate(photo.created_at)}` : ""}`}
                          >
                            <img
                              src={workPhotoThumbUrl(photo)}
                              alt={photo.file_name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition">
                              <Eye className="h-3 w-3 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {item.remarks && (
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground bg-muted/20 rounded p-1.5">
                          Remarks: {item.remarks}
                        </p>
                      )}
                    </div>
                  );
                })}
                  </div>
                ))}
              </div>
            ))}

            {/* Overall Room Remarks — a whole-room note for any problem the entire room faces */}
            <div className="rounded-lg border border-border p-4">
              <label className="text-sm font-medium">Overall Room Remarks</label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isViewer
                  ? currentRoom?.remarks
                    ? "Open issue for this room (held until staff clears it)."
                    : "No overall room issue is held right now."
                  : "If there is an issue, type it here and update — the text stays held. When it is solved, delete that held text and update."}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Textarea
                  value={roomRemarks}
                  onChange={(e) => setRoomRemarks(e.target.value)}
                  placeholder={
                    isViewer
                      ? currentRoom?.remarks || "No overall room remarks yet."
                      : currentRoom?.remarks
                        ? "Held issue text. Remove it and update when solved, or replace it with a new issue."
                        : "Describe the room issue…"
                  }
                  readOnly={isViewer}
                />
                {!isViewer && (
                  <Button
                    className="sm:self-end"
                    disabled={
                      !roomId ||
                      roomId.startsWith("virtual-") ||
                      saveRoomRemarks.isPending ||
                      roomRemarks.trim() === (currentRoom?.remarks ?? "").trim()
                    }
                    onClick={() => setConfirmRemarks(roomRemarks.trim() ? "save" : "clear")}
                  >
                    {saveRoomRemarks.isPending
                      ? "Saving…"
                      : roomRemarks.trim()
                        ? currentRoom?.remarks
                          ? "Update remarks"
                          : "Hold as issue"
                        : "Update remarks"}
                  </Button>
                )}
              </div>
            </div>

            {/* Delete this room (Req 2) — below the overall remarks, staff only */}
            {!isViewer && currentRoom && !roomId.startsWith("virtual-") && (
              <div className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  disabled={deleteRoom.isPending}
                  onClick={() => {
                    setConfirmRoomName("");
                    setRoomDeleting({ id: currentRoom.id, name: currentRoom.name, confirmed: false });
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete this room
                </Button>
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  Permanently removes this room. If it has no remaining works, the room is deleted.
                  {lastRoomInCustomArea
                    ? " This is the last room of this type, so the room type will also be removed."
                    : ""}
                </p>
              </div>
            )}
          </section>

          <aside className="panel h-fit space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl uppercase font-display font-semibold">Tasks details</h2>
                {!isViewer && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!roomId || roomId.startsWith("virtual-")) {
                          toast.error("Open a saved room before editing.");
                          return;
                        }
                        setEditRoomName(roomName);
                        setEditTasks(
                          displayItems
                            .filter((item) => !item.id.startsWith("virtual-"))
                            .map((item) => ({
                              id: item.id,
                              group_name: item.group_name,
                              subgroup: item.subgroup ?? "",
                              title: item.title,
                            })),
                        );
                        setEditRoomOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                      title="Edit room name and tasks"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode("work");
                        setNewItem({ title: "", group_name: "", subgroup: "", kind: "work", quantity: 1 });
                        setHeadingPick("");
                        setSubheadingPick("");
                        setWorkPick("");
                        setAddItemOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                      title="Add a work or material task"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode("product");
                        setNewItem({ title: "", group_name: "", subgroup: "", kind: "product", quantity: 1 });
                        setHeadingPick("");
                        setSubheadingPick("");
                        setWorkPick("");
                        setAddItemOpen(true);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition cursor-pointer"
                      title="Add a product (table, chair, count)"
                    >
                      <Package className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <span className="text-xs font-semibold text-muted-foreground bg-surface px-2.5 py-1 rounded-md border border-border">
                {displayItems.length} Tasks
              </span>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {grouped.map(([group, subgroups], gIdx) => (
                <div key={group} className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">
                    {gIdx + 1}. {group}
                  </div>
                  {subgroups.map(([sub, groupItems]) => (
                    <div key={`${group}-${sub || "none"}`} className="space-y-1">
                      {sub ? (
                        <div className="pl-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {sub}
                        </div>
                      ) : null}
                      <ol className="list-decimal space-y-2 pl-8 text-sm">
                        {groupItems.map((item) => {
                      const displayStatus = getItemDisplayStatus(item, isViewer);
                      const displayTone = getItemStatusTone(item, isViewer);
                      const itemPhotos = photos.filter((p) => p.work_item_id === item.id);

                      return (
                        <li key={item.id} className="text-foreground/90 pl-1">
                          <div className="font-medium inline">
                            {item.title}
                            {item.kind === "product" ? ` (${item.quantity ?? 0})` : ""}
                          </div>
                          {!isViewer && (
                            <button
                              type="button"
                              onClick={() => setDeleteItem({ id: item.id, title: item.title })}
                              className="ml-1.5 inline-flex items-center rounded p-0.5 text-muted-foreground/60 transition hover:text-red-600"
                              title="Delete this work item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${toneClass[displayTone] || toneClass[statusTone(statusTone(item.status))]} border-status-progress bg-status-progress/15 text-status-progress`}
                            >
                              {displayStatus}
                            </span>
                            {itemPhotos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setLightboxPhoto(itemPhotos[0] ?? null)}
                                className="text-[11px] text-primary hover:underline font-medium"
                              >
                                📷 {itemPhotos.length} photo{itemPhotos.length > 1 ? "s" : ""}
                              </button>
                            )}
                            {item.remarks && (
                              <span className="text-muted-foreground italic">— {item.remarks}</span>
                            )}
                          </div>
                          {!isViewer && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {statusesFor(item.kind).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => openStatusPrompt(item, status)}
                                  className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                    item.status === status
                                      ? toneClass[statusTone(status)]
                                      : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {STATUS_LABEL[status]}
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                      </ol>
                    </div>
                  ))}
                </div>
              ))}

              {displayItems.length === 0 && (
                <p className="text-sm text-muted-foreground">Select a room to see tasks.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Status Update & Range Slider Modal */}
      <Dialog open={!!promptState} onOpenChange={(open) => !open && setPromptState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>Update Task Status</span>
            </DialogTitle>
          </DialogHeader>

          {promptState && (
            <div className="space-y-4 py-2">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Task</span>
                <p className="font-semibold text-foreground text-base">{promptState.item.title}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Target Status:</span>
                <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${toneClass[statusTone(promptState.targetStatus)]}`}>
                  {STATUS_LABEL[promptState.targetStatus] || promptState.targetStatus}
                </span>
              </div>

              {/* Range Percentage Slider */}
              <div className="space-y-2 rounded-lg border border-border/80 bg-surface p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="progress-range" className="text-xs font-semibold uppercase text-muted-foreground">
                    Completion Range
                  </Label>
                  <span className="font-display text-lg font-bold text-primary">
                    {promptRange}%
                  </span>
                </div>
                <input
                  id="progress-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={promptRange}
                  onChange={(e) => setPromptRange(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0% (Not Started)</span>
                  <span>50% (In-Progress)</span>
                  <span>100% (Done)</span>
                </div>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <Label htmlFor="prompt-remarks" className="text-xs font-semibold uppercase text-muted-foreground">
                  Remarks / Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="prompt-remarks"
                  value={promptRemarks}
                  onChange={(e) => setPromptRemarks(e.target.value)}
                  placeholder={
                    promptState.targetStatus === "issue"
                      ? "Explain the issue in detail…"
                      : promptState.targetStatus === "hold"
                        ? "Specify reason for hold…"
                        : "Enter remarks for this update (required)…"
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPromptState(null)} disabled={saveStatus.isPending}>
              Cancel
            </Button>
            <Button onClick={handlePromptSave} disabled={saveStatus.isPending || !promptRemarks.trim()}>
              {saveStatus.isPending ? "Saving…" : "Save Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Update Confirmation Modal (Req 2) */}
      <Dialog open={!!confirmState} onOpenChange={(open) => !open && setConfirmState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>Confirm Update</span>
            </DialogTitle>
          </DialogHeader>

          {confirmState && (
            <div className="space-y-3 py-2 text-sm">
              <p>
                Save "<span className="font-semibold text-foreground">{confirmState.item.title}</span>"
                as{" "}
                <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${toneClass[statusTone(confirmState.targetStatus)]}`}>
                  {STATUS_LABEL[confirmState.targetStatus] || confirmState.targetStatus}
                </span>
                ?
              </p>
              <p className="text-muted-foreground">
                Remarks: {confirmState.formattedRemarks}
              </p>
              <p className="text-muted-foreground">
                This will be recorded as an update for this task and shown to the admin view.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmState(null)} disabled={saveStatus.isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={saveStatus.isPending}>
              {saveStatus.isPending ? "Saving…" : "Yes, Save Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit room name and task headings */}
      <Dialog open={editRoomOpen} onOpenChange={(open) => !open && setEditRoomOpen(false)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit room and tasks</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Subheading is optional. Predefined tasks such as Carpentry Work can be saved with heading and work only.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-room-name" className="text-xs font-semibold uppercase text-muted-foreground">
                Room name
              </Label>
              <Input
                id="edit-room-name"
                value={editRoomName}
                onChange={(e) => setEditRoomName(e.target.value)}
                placeholder="e.g. 10 A"
              />
            </div>
            {editTasks.map((task, idx) => (
              <div key={task.id} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Task {idx + 1}
                </p>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Heading <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={task.group_name}
                    onChange={(e) =>
                      setEditTasks((prev) =>
                        prev.map((row) => (row.id === task.id ? { ...row, group_name: e.target.value } : row)),
                      )
                    }
                    placeholder="Main heading"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Sub heading <span className="font-normal normal-case">(optional)</span>
                  </Label>
                  <Input
                    value={task.subgroup}
                    onChange={(e) =>
                      setEditTasks((prev) =>
                        prev.map((row) => (row.id === task.id ? { ...row, subgroup: e.target.value } : row)),
                      )
                    }
                    placeholder="Leave blank if this task has no subheading"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Work <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={task.title}
                    onChange={(e) =>
                      setEditTasks((prev) =>
                        prev.map((row) => (row.id === task.id ? { ...row, title: e.target.value } : row)),
                      )
                    }
                    placeholder="Work / task"
                  />
                </div>
              </div>
            ))}
            {editTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">This room has no saved tasks to edit yet.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditRoomOpen(false)} disabled={saveRoomAndTasks.isPending}>
              Cancel
            </Button>
            <Button onClick={() => saveRoomAndTasks.mutate()} disabled={saveRoomAndTasks.isPending}>
              {saveRoomAndTasks.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Work Item Dialog (Req 4) */}
      <Dialog open={addItemOpen} onOpenChange={(open) => !open && setAddItemOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {addMode === "product" ? "Add Product" : "Add New Work Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ni-group" className="text-xs font-semibold uppercase text-muted-foreground">
                Main Heading <span className="text-red-500">*</span>
              </Label>
              <Select
                value={headingOptions.includes(selectedHeading) ? selectedHeading : "__others"}
                onValueChange={(v) => {
                  setHeadingPick(v);
                  setSubheadingPick("");
                  setWorkPick("");
                  setNewItem((prev) => ({
                    ...prev,
                    group_name: v === "__others" ? "" : v,
                    subgroup: "",
                    title: "",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select heading or Others…" />
                </SelectTrigger>
                <SelectContent>
                  {headingOptions.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                  <SelectItem value="__others">Others…</SelectItem>
                </SelectContent>
              </Select>
              {!headingOptions.includes(selectedHeading) && (
                <Input
                  id="ni-group"
                  value={newItem.group_name}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, group_name: e.target.value, subgroup: "", title: "" }))
                  }
                  placeholder="e.g. Civil Work, Electrical Work, Crafts"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-sub" className="text-xs font-semibold uppercase text-muted-foreground">
                Sub Heading <span className="font-normal normal-case">(optional)</span>
              </Label>
              <Select
                value={
                  !selectedSubheading
                    ? "__none"
                    : subheadingOptions.includes(selectedSubheading)
                      ? selectedSubheading
                      : "__others"
                }
                onValueChange={(v) => {
                  setSubheadingPick(v);
                  setWorkPick("");
                  setNewItem((prev) => ({
                    ...prev,
                    subgroup: v === "__others" || v === "__none" ? "" : v,
                    title: "",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sub heading or skip…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No subheading</SelectItem>
                  {subheadingOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="__others">Others…</SelectItem>
                </SelectContent>
              </Select>
              {!!selectedSubheading && !subheadingOptions.includes(selectedSubheading) && (
                <Input
                  id="ni-sub"
                  value={newItem.subgroup}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, subgroup: e.target.value, title: "" }))}
                  placeholder="e.g. False Ceiling, Wall Painting"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ni-title" className="text-xs font-semibold uppercase text-muted-foreground">
                Work / Task <span className="text-red-500">*</span>
              </Label>
              <Select
                value={workOptions.includes(toTitleCase(newItem.title)) ? toTitleCase(newItem.title) : "__others"}
                onValueChange={(v) => {
                  setWorkPick(v);
                  setNewItem((prev) => ({ ...prev, title: v === "__others" ? "" : v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select work or Others…" />
                </SelectTrigger>
                <SelectContent>
                  {workOptions.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                  <SelectItem value="__others">Others…</SelectItem>
                </SelectContent>
              </Select>
              {!workOptions.includes(toTitleCase(newItem.title)) && (
                <Input
                  id="ni-title"
                  value={newItem.title}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Plain false ceiling, Zebra blind"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Action <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newItem.kind}
                onValueChange={(v) =>
                  setNewItem({ ...newItem, kind: v as "work" | "material" | "product" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">
                    Work — Hold / In-Progress / Completed / Issue / Photo
                  </SelectItem>
                  <SelectItem value="material">
                    Material — Ordered / Received / Supplied / Installed / Photo
                  </SelectItem>
                  <SelectItem value="product">
                    Product — Good / Damaged / Count High / Count Low
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newItem.kind === "product" && (
              <div className="space-y-1.5">
                <Label htmlFor="ni-qty" className="text-xs font-semibold uppercase text-muted-foreground">
                  Count <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ni-qty"
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, quantity: parseInt(e.target.value, 10) || 1 }))
                  }
                  placeholder="e.g. 12 tables"
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              If the heading or subheading already exists, the task is shown in that existing list.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddItemOpen(false)} disabled={addWorkItem.isPending}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmAdd(true)} disabled={addWorkItem.isPending}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAdd} onOpenChange={setConfirmAdd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{addMode === "product" ? "Add this product?" : "Add this task?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {toAllCaps(newItem.group_name) || "Heading"} / {toTitleCase(newItem.subgroup) || "Subheading"} /{" "}
              {toTitleCase(newItem.title) || "Work"}
              {newItem.kind === "product" ? ` · count ${newItem.quantity}` : ""}. If this heading or
              subheading already exists, the task is added to that list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                addWorkItem.mutate();
              }}
            >
              {addWorkItem.isPending ? "Adding…" : "Yes, add"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemarks} onOpenChange={(o) => !o && setConfirmRemarks(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRemarks === "clear" ? "Mark this room issue as solved?" : "Save as a room issue?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemarks === "clear"
                ? "The held issue text will be removed and this room will leave the Issues list. You can type a new issue later."
                : "This text is held as the overall room issue until staff deletes it and updates remarks."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                saveRoomRemarks.mutate(roomRemarks);
                setConfirmRemarks(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Work Item Confirmation (Req 3) */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this work item?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteItem?.title ?? ""}” and its photos/updates will be permanently removed from
              this room. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteWorkItem.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteItem) deleteWorkItem.mutate(deleteItem.id);
              }}
            >
              {deleteWorkItem.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Room — Step 1: primary confirmation (Req 2) */}
      <AlertDialog
        open={!!roomDeleting && !roomDeleting.confirmed}
        onOpenChange={(o) => !o && setRoomDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>
              “{roomDeleting?.name ?? ""}” and all its works, photos and progress updates will be
              permanently removed. This cannot be undone.
              {lastRoomInCustomArea && (
                <span className="mt-1 block text-red-600">
                  This is the last room in this area — the entire “{areaLabel(area)}” room type / tab will be
                  removed permanently.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoom.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteRoom.isPending}
              onClick={(e) => {
                e.preventDefault();
                setRoomDeleting((prev) => (prev ? { ...prev, confirmed: true } : prev));
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Room — Step 2: secondary confirmation (type the room name) */}
      <AlertDialog
        open={!!roomDeleting && roomDeleting.confirmed}
        onOpenChange={(o) => !o && setRoomDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Type the room name <b>“{roomDeleting?.name ?? ""}”</b> below to permanently delete it.
              {lastRoomInCustomArea && (
                <span className="mt-1 block text-red-600">
                  This removes the entire “{areaLabel(area)}” room type permanently.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <Input
              value={confirmRoomName}
              onChange={(e) => setConfirmRoomName(e.target.value)}
              placeholder={roomDeleting?.name ?? ""}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoom.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteRoom.isPending || confirmRoomName.trim() !== (roomDeleting?.name ?? "")}
              onClick={(e) => {
                e.preventDefault();
                if (roomDeleting) deleteRoom.mutate(roomDeleting.id);
              }}
            >
              {deleteRoom.isPending ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Photo Lightbox Modal with Faded/Blurred Background */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Previous/Left Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
                if (currentIndex !== -1) {
                  const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
                  setLightboxPhoto(photos[prevIndex] ?? null);
                }
              }}
              className="absolute left-2 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-55 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-white/20 text-white transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Previous Image (Left Arrow)"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          {/* Next/Right Arrow Button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = photos.findIndex((p) => p.id === lightboxPhoto.id);
                if (currentIndex !== -1) {
                  const nextIndex = (currentIndex + 1) % photos.length;
                  setLightboxPhoto(photos[nextIndex] ?? null);
                }
              }}
              className="absolute right-2 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-55 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 border border-white/10 hover:border-white/20 text-white transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Next Image (Right Arrow)"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          <div
            className="relative max-w-4xl w-full flex flex-col items-center bg-card/95 border border-border rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close & Details Header */}
            <div className="w-full flex items-center justify-between gap-4 pb-3 border-b border-border/60">
              <div className="truncate">
                <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                  {lightboxPhoto.file_name}
                </h3>
                {lightboxPhoto.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded on {formatPhotoDate(lightboxPhoto.created_at)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {workPhotoOpenUrl(lightboxPhoto) && (
                  <a
                    href={workPhotoOpenUrl(lightboxPhoto)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="rounded-full p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Close (ESC)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* High-Resolution Image Preview */}
            <div className="w-full flex items-center justify-center py-4 max-h-[70vh] overflow-hidden">
              <img
                src={workPhotoThumbUrl(lightboxPhoto)}
                alt={lightboxPhoto.file_name}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}
