"use client";

import { useIsMobile } from "@/hooks/use-reduced-motion";

export function ForegroundArc() {
  const isMobile = useIsMobile();
  const radius = isMobile ? 700 : 1400;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-1/2 rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          bottom: `-${radius * 2 - (isMobile ? 180 : 240)}px`,
          transform: "translateX(-50%)",
          backgroundColor: "color-mix(in srgb, var(--bg-page) 45%, #000000)",
          filter: "blur(12px)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}
