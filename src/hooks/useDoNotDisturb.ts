import { useCallback } from "react";

export interface DNDSchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  days: number[];    // 0-6 (Sunday-Saturday)
}

const DEFAULT_SCHEDULE: DNDSchedule = {
  enabled: false,
  startTime: "22:00",
  endTime: "07:00",
  days: [0, 1, 2, 3, 4, 5, 6], // All days
};

export function useDoNotDisturb() {
  const getSchedule = useCallback((): DNDSchedule => {
    try {
      const saved = localStorage.getItem("dndSchedule");
      if (saved) {
        return { ...DEFAULT_SCHEDULE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Error reading DND schedule:", e);
    }
    return DEFAULT_SCHEDULE;
  }, []);

  const saveSchedule = useCallback((schedule: DNDSchedule) => {
    localStorage.setItem("dndSchedule", JSON.stringify(schedule));
  }, []);

  const isInDNDPeriod = useCallback((): boolean => {
    const schedule = getSchedule();
    
    if (!schedule.enabled) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    
    // Check if current day is in the DND days
    if (!schedule.days.includes(currentDay)) {
      return false;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = schedule.startTime.split(":").map(Number);
    const [endHour, endMin] = schedule.endTime.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight periods (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      // DND is active if current time is after start OR before end
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      // Normal period (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }, [getSchedule]);

  return {
    getSchedule,
    saveSchedule,
    isInDNDPeriod,
  };
}
