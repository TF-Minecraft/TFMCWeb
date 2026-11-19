"use client";

import { useEffect, useState } from "react";

import { getMyAvailability } from "@/lib/lore/api";
import { browserTimeZone, todayIn } from "@/lib/lore/dates";

/**
 * The zone times are shown and entered in: the one saved in my lore settings, else the
 * browser's. Starts with the browser's and switches once the settings load.
 */
export function useLoreTimeZone(): string {
  const [zone, setZone] = useState(browserTimeZone);
  useEffect(() => {
    let live = true;
    const today = todayIn();
    getMyAvailability(today, today)
      .then((mine) => {
        if (live && mine.settings.timezone) setZone(mine.settings.timezone);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return zone;
}
