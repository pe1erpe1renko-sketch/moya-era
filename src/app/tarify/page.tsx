import type { Metadata } from "next";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { PlansGrid, CreditPacks } from "@/components/landing/Pricing";

export const metadata: Metadata = {
  title: "Тарифы — Моя Эра",
  description: "Подписка на шесть систем самопознания: матрица судьбы, натальная карта, дизайн человека, нумерология, таро, совместимость. Единица — человек, отмена в любой день.",
  alternates: { canonical: "/tarify" },
};

const FAQ = [
  { q: "Что значит «единица — человек»?", a: "Подписка открывает полные разборы по датам людей из вашего списка. На базовом тарифе это только вы, на семейном — до пяти человек, на «Практике» — без ограничений. Добавили партнёра — открылась вся его матрица и совместимость с вами." },
  { q: "За что списываются кредиты?", a: "Только за сообщения наставнику — это единственное, что стоит нам денег на каждого пользователя. Чтение разборов, аркан дня, календарь, схема — без счётчиков." },
  { q: "Можно ли отменить?", a: "Да, в любой день из кабинета. Доступ сохраняется до конца оплаченного периода. Возврат за неиспользованный период — по условиям, которые будут опубликованы вместе с офертой." },
  { q: "Есть ли бесплатный доступ?", a: "Да, без регистрации: центральный аркан, схема из 25 точек и первый вопрос в каждой из двенадцати сфер по любой дате." },
];

export default function Page() {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[90px] w-full md:h-[110px]">
        <Header />
      </div>
      <div className="mx-auto w-[min(1200px,92vw)] pb-20 pt-6 md:pt-12">
        <h1 className="text-center font-display text-text-primary" style={{ fontSize: "clamp(32px, 3.6vw, 60px)", lineHeight: 1.06 }}>Тарифы</h1>
        <p className="mx-auto mt-4 max-w-[720px] text-center text-[clamp(16px,1.2vw,19px)] text-text-secondary">Одна подписка — шесть систем и десять типов разбора. Цена одна, без таймеров и «последних мест».</p>
        <div className="mt-10">
          <PlansGrid />
        </div>

        <h2 className="mt-20 font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.6vw, 40px)" }}>Кредиты наставника</h2>
        <p className="mt-2 max-w-[720px] text-[15px] text-text-secondary">Пакет кредитов входит в каждый тариф. Если не хватило — докупите отдельно, они не сгорают.</p>
        <div className="mt-6">
          <CreditPacks />
        </div>

        <h2 className="mt-20 font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.6vw, 40px)" }}>Вопросы</h2>
        <div className="mt-6 max-w-[860px]">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-border/35">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[17px] text-text-primary">
                <span>{item.q}</span>
                <span className="text-text-accent" aria-hidden="true">+</span>
              </summary>
              <p className="pb-5 text-[16px] leading-[1.65] text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
