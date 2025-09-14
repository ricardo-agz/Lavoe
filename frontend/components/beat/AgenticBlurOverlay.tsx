"use client";

import { useEffect, useRef, useState } from "react";

interface AgenticBlurOverlayProps {
  trigger: number;
  durationMs?: number;
}

export default function AgenticBlurOverlay({
  trigger,
  durationMs = 10000,
}: AgenticBlurOverlayProps) {
  const [showShadow, setShowShadow] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = [
    "rgba(255,165,0,0.3)", // Orange
    "rgba(255,69,0,0.3)", // Red-Orange
    "rgba(255,20,147,0.3)", // Deep Pink
    "rgba(138,43,226,0.3)", // Blue Violet
    "rgba(0,191,255,0.3)", // Deep Sky Blue
    "rgba(0,255,127,0.3)", // Spring Green
    "rgba(255,255,0,0.3)", // Yellow
    "rgba(255,140,0,0.3)", // Dark Orange
  ];

  useEffect(() => {
    if (trigger <= 0) return;

    // Clear any previous timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setShowShadow(true);
    setColorIndex(0);

    intervalRef.current = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 1250);

    timeoutRef.current = setTimeout(() => {
      setShowShadow(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setColorIndex(0);
    }, durationMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trigger]);

  return (
    <div
      className={
        "pointer-events-none absolute inset-0 z-[999] transition-all duration-1000"
      }
      style={{
        boxShadow: showShadow
          ? `inset 0 0 100px 20px ${colors[colorIndex]}`
          : "none",
      }}
    />
  );
}
