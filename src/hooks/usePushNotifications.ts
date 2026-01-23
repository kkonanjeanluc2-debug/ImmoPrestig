import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as PushPermissionState);
      
      // Check localStorage for user preference
      const savedPref = localStorage.getItem("pushNotificationsEnabled");
      setIsEnabled(savedPref === "true" && Notification.permission === "granted");
    } else {
      setPermission("unsupported");
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Workers not supported");
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/"
      });
      
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      throw error;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "Les notifications push ne sont pas supportées par votre navigateur.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Register service worker first
      await registerServiceWorker();

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result === "granted") {
        setIsEnabled(true);
        localStorage.setItem("pushNotificationsEnabled", "true");
        
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des notifications push pour les alertes importantes.",
        });
        
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications refusées",
          description: "Vous avez refusé les notifications. Vous pouvez les activer dans les paramètres de votre navigateur.",
          variant: "destructive",
        });
        return false;
      }
      
      return false;
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications push.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registerServiceWorker, toast]);

  const disablePushNotifications = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem("pushNotificationsEnabled", "false");
    
    toast({
      title: "Notifications désactivées",
      description: "Vous ne recevrez plus de notifications push.",
    });
  }, [toast]);

  const togglePushNotifications = useCallback(async () => {
    if (isEnabled) {
      disablePushNotifications();
      return false;
    } else {
      return await requestPermission();
    }
  }, [isEnabled, disablePushNotifications, requestPermission]);

  // Function to show a local push notification
  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!isEnabled || permission !== "granted") {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      return true;
    } catch (error) {
      console.error("Error showing notification:", error);
      return false;
    }
  }, [isEnabled, permission]);

  return {
    permission,
    isSupported,
    isEnabled,
    isLoading,
    requestPermission,
    disablePushNotifications,
    togglePushNotifications,
    showNotification,
  };
}
