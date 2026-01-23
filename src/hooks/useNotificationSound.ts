import { useCallback, useRef } from "react";

export type NotificationSoundType = "info" | "warning" | "error" | "success" | "payment" | "contract";

// Base64 encoded short notification sounds (to avoid external file dependencies)
const SOUND_DATA: Record<NotificationSoundType, string> = {
  // Simple beep for info
  info: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkYuBdnB1fIWMjoqBdnN4gIiNjYmAdnR4gIiNjYl+dHR4gIiOjoqAd3V5gYiNjYl/dnV4gIiOjoqAdnV4gIiNjYl/dXV4gIiNjomAdnV4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl+dXV4gIiNjYl/dnZ4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl/dnV4gIiNjYl/dnV4gIeNjYl/dnV4gIiNjYl/dnV4gIiNjYl/",
  // Alert tone for warning
  warning: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/f39/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/f4WLkZGLhX9/",
  // Urgent tone for error
  error: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVVqqqqdVVV",
  // Pleasant chime for success
  success: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABzdYeRmpqShn1wZ2Nmd4SQmpuUiH5xZ2NmeIOQm5yViH9xZ2NneIORm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5xZmNneIOQm5yViH5x",
  // Cash register for payment
  payment: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABkc4SUnaCckoZ5bmRjZ3WDkZ2gnZOHe29lY2d2hJKeoJ6UiHxwZWNnd4STn6CelIh8cGVjZ3eEk5+gnpSIfHBlY2d3hJOfn56TiHtvZWNnd4STn5+ek4h7b2VjZ3eEk5+fnpOIe29lY2d3hJOfn56TiHtvZWNnd4STn5+ek4h7b2VjZ3eEk5+fnpOIe29lY2d3hJOfn56TiHtvZWNnd4STn5+ek4h7",
  // Document flip for contract
  contract: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/gIKEhoeIiImJiomJiIeGhIOBf31+f4GDhYaIiImKiomJiIeGhIOBf31+f4GDhYaIiImKiomJiIeGhYOBf31+f4GDhYaIiImKiomJiIeGhIOBf31+f4GDhYaHiImKiomIiIeGhIOBf31+gIGDhYaHiImKiomIiIeGhIOBf31+gIGDhYaHiImJiomIiIeGhIOBf31+gIGDhYaHiImJiomIiIeGhIOBf31+",
};

// Map notification entity types to sound types
const ENTITY_TO_SOUND: Record<string, NotificationSoundType> = {
  payment: "payment",
  contract: "contract",
  tenant: "info",
  property: "info",
  owner: "info",
  document: "info",
};

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((type: NotificationSoundType = "info", volume = 0.5) => {
    // Check if sounds are enabled
    const soundsEnabled = localStorage.getItem("notificationSoundsEnabled") !== "false";
    if (!soundsEnabled) return;

    try {
      // Stop any currently playing sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Create and play new audio
      const audio = new Audio(SOUND_DATA[type] || SOUND_DATA.info);
      audio.volume = Math.max(0, Math.min(1, volume));
      audioRef.current = audio;
      
      audio.play().catch((error) => {
        // Silently fail if autoplay is blocked
        console.debug("Could not play notification sound:", error);
      });
    } catch (error) {
      console.debug("Error playing notification sound:", error);
    }
  }, []);

  const playSoundForNotification = useCallback((
    notificationType: "info" | "warning" | "error" | "success",
    entityType?: string | null
  ) => {
    // Determine sound type based on entity or notification type
    let soundType: NotificationSoundType = notificationType;
    
    if (entityType && ENTITY_TO_SOUND[entityType]) {
      soundType = ENTITY_TO_SOUND[entityType];
    }

    playSound(soundType);
  }, [playSound]);

  const testSound = useCallback((type: NotificationSoundType) => {
    playSound(type, 0.7);
  }, [playSound]);

  return {
    playSound,
    playSoundForNotification,
    testSound,
  };
}
