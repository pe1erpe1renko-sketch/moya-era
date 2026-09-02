export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
      style={{ opacity: 0.04 }}
    >
      <svg className="h-full w-full">
        <filter id="hero-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>
    </div>
  );
}
