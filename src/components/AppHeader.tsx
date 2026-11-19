import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  DoorOpen,
  History,
  LogIn,
  LogOut,
  MoreVertical,
  Printer,
  Search,
  X,
} from "lucide-react";
import ymcaLogo from "@/assets/YMCA.jpeg";
import avDynamicsLogo from "@/assets/AV DYNAMICS PRIVATE LIMITED LOGO.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { IssueDock } from "@/components/IssueDock";
import { Input } from "@/components/ui/input";

export function daysLeft(deadline: string) {
  const end = new Date(deadline + "T00:00:00").getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function useSettings() {
  return useQuery({
    queryKey: ["project-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_settings")
        .select("deadline, project_name, dashboard_title, dashboard_subtitle")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number | undefined;
  className?: string | undefined;
  placeholder?: string | undefined;
  inputRef?: React.RefObject<HTMLInputElement | null> | undefined;
};

function SearchField({
  value,
  onChange,
  resultCount,
  className,
  placeholder,
  inputRef,
}: SearchFieldProps) {
  return (
    <div
      className={[
        "neo-inset group/search flex h-10 w-full items-center gap-2 rounded-full px-3.5 transition-shadow focus-within:shadow-[inset_3px_3px_6px_rgba(166,175,195,0.5),inset_-3px_-3px_6px_#d2d8e1,0_0_0_2px_#0f172a]",
        className ?? "",
      ].join(" ")}
    >
      <Search className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-focus-within/search:text-zinc-900" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Search classrooms, labs, rooms…"}
        aria-label="Search classrooms, labs and rooms"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-900 cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="hidden shrink-0 rounded-md border border-zinc-300 bg-white/70 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-zinc-500 shadow-xs sm:inline-flex">
          /
        </kbd>
      )}
      {typeof resultCount === "number" && value.trim() ? (
        <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {resultCount}
        </span>
      ) : null}
    </div>
  );
}

type AppHeaderProps = {
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  resultCount?: number;
  historyValue?: string;
  onHistoryChange?: (value: string) => void;
  onPrint?: (() => void) | undefined;
  onAddRoom?: (() => void) | undefined;
};

export function AppHeader({
  subtitle,
  searchValue,
  onSearchChange,
  resultCount,
  historyValue,
  onHistoryChange,
  onPrint,
  onAddRoom,
}: AppHeaderProps) {
  const { user, role, name, isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const searchEnabled = typeof onSearchChange === "function";

  useEffect(() => {
    if (!menuOpen) setHistoryOpen(false);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    queryClient.setQueryData(["auth-session"], { user: null, role: null, name: "" });
    await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    navigate({ to: "/" });
  };

  // "/" focuses the dashboard search, Escape leaves it.
  useEffect(() => {
    if (!searchEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchEnabled]);

  const initials = (name || "YM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 sm:px-6 sm:pt-3">
      <div className="mx-auto max-w-7xl">
        <div className="neo-nav relative rounded-3xl px-3 py-1.5 sm:rounded-full sm:px-4 sm:py-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Link to="/" className="group flex shrink-0 items-center gap-2 rounded-full p-1">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-neo-sm ring-1 ring-zinc-200 transition-transform duration-300 group-hover:scale-105 sm:h-9 sm:w-9">
                <img src={ymcaLogo} alt="YMCA logo" className="h-full w-full object-cover" />
              </span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate font-display text-[13.5px] font-bold leading-tight tracking-tight text-zinc-900 sm:text-sm">
                  YMCA Boys Town
                </span>
                <span className="hidden truncate text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:block">
                  {subtitle || "Higher Secondary School"}
                </span>
              </span>
            </Link>

            <span className="h-6 w-px shrink-0 bg-zinc-300/50" aria-hidden="true" />

            <Link
              to="/"
              className="shrink-0 rounded-lg p-1 transition-opacity hover:opacity-85"
              aria-label="AV Dynamics home"
            >
              <img
                src={avDynamicsLogo}
                alt="AV Dynamics logo"
                className="h-5 w-auto object-contain sm:h-6"
              />
            </Link>

            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              {searchEnabled ? (
                <SearchField
                  value={searchValue ?? ""}
                  onChange={onSearchChange}
                  resultCount={resultCount}
                  inputRef={searchRef}
                  className="hidden lg:flex lg:w-36 xl:w-44"
                />
              ) : null}

              {onAddRoom ? (
                <button
                  type="button"
                  onClick={onAddRoom}
                  className="hidden shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-zinc-600 transition hover:bg-white/60 hover:text-zinc-950 cursor-pointer lg:flex"
                  title="Add a room type or more rooms"
                >
                  <DoorOpen className="h-4 w-4" />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Add room</span>
                </button>
              ) : null}

              <div className="hidden shrink-0 lg:flex">
                <IssueDock variant="nav" />
              </div>

              {/* Mobile: compact search */}
              <div className="min-w-0 flex-1 lg:hidden">
                {searchEnabled ? (
                  <SearchField
                    value={searchValue ?? ""}
                    onChange={onSearchChange}
                    resultCount={resultCount}
                    placeholder="Search…"
                  />
                ) : (
                  <span className="block w-full" />
                )}
              </div>

              {/* Mobile: issues */}
              <div className="shrink-0 lg:hidden">
                <IssueDock variant="nav" />
              </div>

              {/* Mobile: 3-dot menu */}
              <div ref={menuRef} className="relative shrink-0 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white/70 hover:text-zinc-950 cursor-pointer"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/90 bg-[#eef2f6] p-1.5 shadow-[8px_12px_28px_rgba(150,168,195,0.5),-6px_-6px_18px_#d2d8e1]"
                  >
                    <div className="px-2.5 pb-1 pt-1.5">
                      <p className="truncate text-[13px] font-bold text-zinc-900">
                        {user ? name || "Staff member" : "Guest"}
                      </p>
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                        {user
                          ? isStaff
                            ? "Staff Edit"
                            : role === "admin"
                              ? "Admin"
                              : "Viewer"
                          : "Not signed in"}
                      </p>
                    </div>
                    <div className="mx-1 mb-1 h-px bg-zinc-300/60" aria-hidden="true" />

                    {onAddRoom ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onAddRoom();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold text-zinc-800 transition hover:bg-white cursor-pointer"
                      >
                        <DoorOpen className="h-4 w-4 shrink-0 text-zinc-500" />
                        Add Room
                      </button>
                    ) : null}

                    {onHistoryChange ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setHistoryOpen((open) => !open)}
                          aria-expanded={historyOpen}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold text-zinc-800 transition hover:bg-white cursor-pointer"
                        >
                          <History className="h-4 w-4 shrink-0 text-zinc-500" />
                          History
                          <ChevronDown
                            className={`ml-auto h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${
                              historyOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {historyOpen && (
                          <div className="space-y-1.5 px-1 pb-1.5 pt-1">
                            <Input
                              type="date"
                              value={historyValue ?? ""}
                              onChange={(event) => onHistoryChange(event.target.value)}
                              className="h-9 w-full rounded-xl border border-white/90 bg-white px-2 text-[13px] text-zinc-900 shadow-xs [color-scheme:light] focus-visible:ring-1"
                            />
                            {historyValue ? (
                              <button
                                type="button"
                                onClick={() => onHistoryChange("")}
                                className="w-full rounded-xl px-2 py-1 text-[11px] font-semibold text-zinc-500 transition hover:bg-white hover:text-zinc-900 cursor-pointer"
                              >
                                Clear date filter
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : null}

                    {onPrint ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onPrint();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold text-zinc-800 transition hover:bg-white cursor-pointer"
                      >
                        <Printer className="h-4 w-4 shrink-0 text-zinc-500" />
                        Print Report
                      </button>
                    ) : null}

                    {user ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          void signOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold text-zinc-800 transition hover:bg-white cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                        Logout
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-semibold text-zinc-800 transition hover:bg-white cursor-pointer"
                      >
                        <LogIn className="h-4 w-4 shrink-0 text-zinc-500" />
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop: account / login */}
              <div className="hidden shrink-0 items-center gap-2 lg:flex">
                {user ? (
                  <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-2 py-1 shadow-neo-sm">
                    <div className="hidden pl-1 text-right lg:block">
                      <div className="max-w-[9rem] truncate text-[12px] font-bold leading-tight text-zinc-900">
                        {name || "Staff member"}
                      </div>
                      <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                        {isStaff ? "Staff Edit" : role === "admin" ? "Admin" : "Viewer"}
                      </div>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white shadow-xs">
                      {initials || "YM"}
                    </span>
                    <button
                      type="button"
                      onClick={signOut}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-950 px-4 text-[12px] font-bold text-white shadow-neo-sm transition hover:bg-black sm:px-4.5 cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
