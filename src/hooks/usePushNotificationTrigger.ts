import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationSound } from "@/hooks/useNotificationSound";

/**
 * Hook to trigger browser push notifications when new in-app notifications are created.
 * Works alongside the existing notification system to provide alerts even when the app is not focused.
 */
export function usePushNotificationTrigger() {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { playSoundForNotification } = useNotificationSound();

  const showPushNotification = useCallback(async (title: string, body: string, data?: Record<string, unknown>) => {
    // Check if push notifications are enabled
    const pushEnabled = localStorage.getItem("pushNotificationsEnabled") === "true";
    if (!pushEnabled || Notification.permission !== "granted") {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: data?.id as string || "notification",
        data,
      });
    } catch (error) {
      console.error("Error showing push notification:", error);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Check if service worker and notifications are supported
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }

    // Subscribe to new notifications
    const channel = supabase
      .channel("push-notification-trigger")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as {
            id: string;
            title: string;
            message: string;
            type: "info" | "warning" | "error" | "success";
            entity_type?: string;
            entity_id?: string;
          };

          // Play notification sound
          playSoundForNotification(notification.type, notification.entity_type);

          // Show browser push notification
          await showPushNotification(notification.title, notification.message, {
            id: notification.id,
            type: notification.type,
            entity_type: notification.entity_type,
            entity_id: notification.entity_id,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, showPushNotification, playSoundForNotification]);
}
