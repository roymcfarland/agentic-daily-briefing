"use client";

import { useEffect, useState } from "react";

const DELIVERY_HOUR_MOUNTAIN = 6;
const TICK_INTERVAL_MS = 30_000;

function minutesUntilNextDelivery(now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const nowMinutes = hour * 60 + minute;
  const targetMinutes = DELIVERY_HOUR_MOUNTAIN * 60;

  let diff = targetMinutes - nowMinutes;
  if (diff <= 0) {
    diff += 24 * 60;
  }

  return diff;
}

function formatRemaining(minutes: number): string {
  if (minutes <= 0) {
    return "Delivering now";
  }

  if (minutes < 60) {
    return `Next: ${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `Next: ${hours}h ${remainder.toString().padStart(2, "0")}m`;
}

export default function LiveCountdown() {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setMinutesLeft(minutesUntilNextDelivery(new Date()));
    }

    tick();
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span suppressHydrationWarning>
      {minutesLeft === null ? "Next: 6:00 AM MT" : formatRemaining(minutesLeft)}
    </span>
  );
}
