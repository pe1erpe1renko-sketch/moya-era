export type DirectionLine = {
  n: string;
  title: string;
  text: string;
};

export function DirectionLines({
  title,
  subtitle,
  lines,
}: {
  title: string;
  subtitle: string;
  lines: DirectionLine[];
}) {
  return (
    <section
      className="relative w-full bg-bg-page"
      style={{
        paddingTop: "clamp(80px, 9vh, 140px)",
        paddingBottom: "clamp(80px, 9vh, 140px)",
      }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-[4vw] md:px-6">
        <h2
          className="text-center font-display text-text-primary"
          style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.1 }}
        >
          {title}
        </h2>
        <p
          className="mx-auto text-center text-text-secondary"
          style={{ marginTop: 14, fontSize: "clamp(15px, 1.2vw, 19px)", maxWidth: 720 }}
        >
          {subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 24, marginTop: 48 }}>
          {lines.map((l) => (
            <div
              key={l.n}
              className="bg-surface-1"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 28,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text-accent)" }}>
                {l.n}
              </div>
              <h3
                className="font-display text-text-primary"
                style={{ marginTop: 10, fontSize: "clamp(19px, 1.5vw, 25px)", lineHeight: 1.2 }}
              >
                {l.title}
              </h3>
              <p
                className="text-text-secondary"
                style={{ marginTop: 10, fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.6 }}
              >
                {l.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
