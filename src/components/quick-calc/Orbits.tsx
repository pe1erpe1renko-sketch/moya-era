type OrbitSpec = {
  /** radius in % of area width */
  r: number;
  squash: number;
  tilt: number;
  period: number;
  dot: number;
  opacity: number;
  phases: number[];
};

export const ORBITS: OrbitSpec[] = [
  { r: 34, squash: 0.32, tilt: -18, period: 12, dot: 8, opacity: 1, phases: [0, 180] },
  { r: 44, squash: 0.26, tilt: 28, period: 19, dot: 6, opacity: 0.75, phases: [0] },
  { r: 52, squash: 0.4, tilt: -62, period: 27, dot: 5, opacity: 0.55, phases: [0, 140] },
];

export function Orbits({
  speedFactor,
  dim,
  still,
}: {
  speedFactor: number;
  dim: boolean;
  still: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 transition-opacity duration-700"
      style={{ opacity: dim ? 0.35 : 1 }}
    >
      {/* orbit lines */}
      {ORBITS.map((o, i) => (
        <div
          key={`line-${i}`}
          className="absolute left-1/2 top-1/2 aspect-square rounded-full"
          style={{
            width: `${o.r * 2}%`,
            border: "1px solid rgba(159, 186, 185, 0.35)",
            transform: `translate(-50%, -50%) rotate(${o.tilt}deg) scaleY(${o.squash})`,
          }}
        />
      ))}

      {/* stars */}
      {ORBITS.map((o, i) => (
        <div
          key={`orbit-${i}`}
          className="absolute left-1/2 top-1/2 aspect-square"
          style={{
            width: `${o.r * 2}%`,
            transform: `translate(-50%, -50%) rotate(${o.tilt}deg) scaleY(${o.squash})`,
          }}
        >
          {o.phases.map((phase) => (
            <div
              key={phase}
              className="absolute inset-0"
              style={{
                animation: still
                  ? "none"
                  : `qc-orbit-spin ${o.period / speedFactor}s linear infinite`,
                animationDelay: still ? undefined : `-${(phase / 360) * (o.period / speedFactor)}s`,
                transform: still ? `rotate(${phase}deg)` : undefined,
                transition: "none",
              }}
            >
              <div
                className="absolute left-1/2 top-0 rounded-full bg-text-primary"
                style={{
                  width: o.dot,
                  height: o.dot,
                  opacity: o.opacity,
                  boxShadow: "0 0 12px 2px rgba(230, 240, 239, 0.5)",
                  transform: `translate(-50%, -50%) scaleY(${1 / o.squash})`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Радиальное свечение + орбиты + центральный знак (? или номер аркана). */
export function OrbitStage({
  value,
  speedFactor,
  still,
}: {
  value: number | null;
  speedFactor: number;
  still: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(122, 93, 168, 0.22) 0%, rgba(122, 93, 168, 0) 55%)",
        }}
      />

      <Orbits speedFactor={speedFactor} dim={value !== null} still={still} />

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="qc-numeral font-mono text-text-accent"
          aria-hidden={value === null ? true : undefined}
          style={{ animation: still || value === null ? "none" : "qc-result-in 800ms ease-out both" }}
        >
          {value === null ? "?" : value}
        </span>
      </div>
    </div>
  );
}
