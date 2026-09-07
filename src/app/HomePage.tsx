import { Header } from "@/components/hero/Header";
import { StarField } from "@/components/hero/StarField";
import { DirectionWheel } from "@/components/hero/DirectionWheel";
import { ForegroundArc } from "@/components/hero/ForegroundArc";
import { Headline } from "@/components/hero/Headline";
import { Grain } from "@/components/hero/Grain";
import { QuickCalc } from "@/components/quick-calc/QuickCalc";
import { matrixCounts } from "@/lib/matrix";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ExampleScheme } from "@/components/landing/ExampleScheme";
import { DirectionsGrid } from "@/components/landing/DirectionsGrid";
import { AskCards } from "@/components/landing/AskCards";
import { NotFortuneTelling } from "@/components/landing/NotFortuneTelling";
import { WhatsNext } from "@/components/landing/WhatsNext";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  // Сколько сфер и вопросов в полной матрице — из карты позиций, а не с потолка.
  const counts = matrixCounts();
  return (
    <main className="relative w-full bg-bg-page">
      {/* hero-stage: на невысоких телефонах первому экрану даётся
          минимальная высота — иначе карточке колеса не остаётся места
          между шапкой и заголовком, и она ложится на буквы. */}
      <div
        className="hero-stage relative min-h-screen w-full overflow-hidden bg-bg-page"
        style={{ paddingTop: "clamp(76px, 6.5vh, 104px)" }}
      >
        <StarField />
        <ForegroundArc />
        <Grain />
        <Header />

        <div
          aria-hidden="true"
          className="hero-glow pointer-events-none absolute bottom-0 left-0 right-0 z-[11]"
        />

        <div className="absolute inset-0 z-[12]">
          <DirectionWheel />
        </div>

        <div className="pointer-events-none absolute inset-0 z-[40] w-full md:z-[15]">
          <div className="hero-text-block pointer-events-auto">
            <Headline />
          </div>
        </div>

      </div>

      <QuickCalc spheres={counts.spheres} questions={counts.questions} />
      <HowItWorks />
      <ExampleScheme />
      <DirectionsGrid />
      <AskCards />
      <NotFortuneTelling />
      <WhatsNext />
      <Pricing />
      <Faq />
      <QuickCalc
        id="start"
        title="Начни с даты"
        subtitle="Один аркан бесплатно, прямо сейчас"
        spheres={counts.spheres}
        questions={counts.questions}
      />
      <Footer />
    </main>
  );
}
