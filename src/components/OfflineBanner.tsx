import { useEffect, useRef } from "react";
import { toast } from "sonner";

const OFFLINE_TOAST_ID = "network-offline";

export function OfflineBanner() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const showOfflineToast = () => {
      if (wasOffline.current) return;
      wasOffline.current = true;
      toast.error("You are offline", {
        id: OFFLINE_TOAST_ID,
        description:
          "Room updates, photos and reports cannot be saved until this device is back online. Reconnect, then continue.",
        duration: Infinity,
      });
    };

    const showOnlineToast = () => {
      toast.dismiss(OFFLINE_TOAST_ID);
      if (wasOffline.current) {
        toast.success("You are back online", {
          description: "You can save room updates, photos and reports again.",
          duration: 4000,
        });
      }
      wasOffline.current = false;
    };

    const onOffline = () => {
      showOfflineToast();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", showOnlineToast);

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      showOfflineToast();
    }

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", showOnlineToast);
      toast.dismiss(OFFLINE_TOAST_ID);
    };
  }, []);

  return null;
}
