import { Section } from "@/components/landing/Section";

export type FaqItem = { q: string; a: string };

export function DirectionFaq({
  title,
  items,
  id = "faq",
}: {
  title: string;
  items: FaqItem[];
  id?: string;
}) {
  return (
    <Section
      id={id}
      title={title}
      style={{
        paddingBottom: "calc(clamp(80px, 10vh, 160px) + var(--transition-depth) + 24px)",
      }}
    >
      <div className="mx-auto mt-12 w-full max-w-[860px]">
        {items.map((item) => (
          <details key={item.q} className="group border-b border-border/35">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-[22px] text-text-primary">
              <span style={{ fontSize: 17 }}>{item.q}</span>
              <span
                className="relative mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center text-text-accent"
                aria-hidden="true"
              >
                <span className="absolute transition-opacity duration-200 ease-out group-open:opacity-0">
                  +
                </span>
                <span className="absolute opacity-0 transition-opacity duration-200 ease-out group-open:opacity-100">
                  −
                </span>
              </span>
            </summary>
            <div className="pb-[22px]">
              <p className="text-text-secondary" style={{ fontSize: 17 }}>
                {item.a}
              </p>
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}
