import type { CSSProperties, ReactNode } from "react";

export function Section({
  id,
  title,
  subtitle,
  children,
  className,
  style,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      id={id}
      className={`relative w-full bg-bg-page ${className ?? ""}`}
      style={{
        paddingTop: "clamp(80px, 10vh, 160px)",
        paddingBottom: "clamp(80px, 10vh, 160px)",
        ...style,
      }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-[4vw] md:px-6">
        <h2
          className="text-center font-display text-text-primary"
          style={{ fontSize: "clamp(32px, 3.4vw, 64px)", letterSpacing: "0.01em", lineHeight: 1.08 }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mx-auto mt-4 max-w-[760px] text-center text-text-secondary"
            style={{ fontSize: "clamp(16px, 1.2vw, 20px)" }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

export const CARD_GRADIENT =
  "linear-gradient(to bottom, rgba(3, 25, 30, 0) 40%, rgba(3, 25, 30, 0.55) 60%, rgba(3, 25, 30, 0.88) 78%, rgba(3, 25, 30, 0.97) 100%)";
