import Link from "next/link";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";

type Props = { title: string };

export function SoonPage({ title }: Props) {
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

        <p className="mt-4 text-[16px] text-text-secondary">Страница готовится</p>

        <Link href="/" className="mt-12 inline-block text-text-accent hover:underline">
          ← На главную
        </Link>
      </div>

      <Footer />
    </main>
  );
}
