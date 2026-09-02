import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";

type Props = {
  title: string;
  body: string;
  draftNotice?: boolean;
};

export function DocPage({ title, body, draftNotice = false }: Props) {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[110px] w-full">
        <Header />
      </div>

      <div
        className="mx-auto w-full max-w-[800px] px-[clamp(24px,5vw,40px)]"
        style={{
          paddingTop: "clamp(80px, 10vh, 140px)",
          paddingBottom: "clamp(80px, 10vh, 140px)",
        }}
      >
        <h1
          className="font-display text-text-primary"
          style={{ fontSize: "clamp(30px, 3vw, 52px)", lineHeight: 1.08 }}
        >
          {title}
        </h1>
        <p className="mt-4 text-[13px] text-text-secondary">Обновлено: —</p>

        <div
          className="mt-10 text-[16px] text-text-secondary"
          style={{ lineHeight: 1.7 }}
        >
          {body}
        </div>

        {draftNotice && (
          <p className="mt-8 text-[13px] text-text-secondary opacity-60">
            Страница-заготовка. Перед запуском текст должен быть подготовлен юристом.
          </p>
        )}

        <Link href="/" className="mt-12 inline-block text-text-accent hover:underline">
          ← На главную
        </Link>
      </div>

      <Footer />
    </main>
  );
}
