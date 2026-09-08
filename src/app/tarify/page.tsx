import type { Metadata } from "next";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";
import { PlansGrid, CreditPacks } from "@/components/landing/Pricing";

export const metadata: Metadata = {
  title: "Тарифы — Моя Эра",
  description: "Одна подписка открывает всё: матрица судьбы, натальная карта, дизайн человека, нумерология, таро, совместимость. Тарифы отличаются числом людей и кредитами, отмена в любой день.",
  alternates: { canonical: "/tarify" },
};

/**
 * СТРАНИЦА ТАРИФОВ. Продаём подписку целиком: отдельных разборов на
 * продажу нет. Человек с замка попадает сюда без параметров — никакой
 * тариф не подсвечен и не «рекомендован», все три показаны одинаково.
 */

const FAQ = [
  {
    q: "Можно ли купить один разбор?",
    a: "Нет, отдельные разборы не продаются. Подписка открывает всё сразу: все шесть систем по датам ваших людей, каждый вопрос в каждом разборе, карту дня, сводку в Telegram и архив. Так проще: не нужно решать, за какой разбор платить.",
  },
  {
    q: "Чем тарифы отличаются друг от друга?",
    a: "Только двумя вещами: сколько людей можно добавить в список (на сайте и в Telegram-боте) и сколько кредитов начисляется в месяц. Всё остальное — системы, разборы, карта дня, бот, архив — одинаково в каждом тарифе.",
  },
  {
    q: "Что значит «единица — человек»?",
    a: "Подписка открывает полные разборы по датам людей из вашего списка. Сколько людей можно добавить, написано на карточке тарифа. Добавили партнёра — открылась вся его матрица, карта, бодиграф и совместимость с вами.",
  },
  {
    q: "За что списываются кредиты?",
    a: "За сообщения наставнику и расклады таро — и больше ни за что. Чтение разборов, карта дня, календарь и схемы без счётчиков. В каждом тарифе есть месячный пакет кредитов, а докупленные не сгорают.",
  },
  {
    q: "Можно ли отменить?",
    a: "Да, в любой день из кабинета, в один шаг. Доступ сохраняется до конца оплаченного периода. Возврат за неиспользованный период — по условиям, которые будут опубликованы вместе с офертой.",
  },
  {
    q: "Есть ли бесплатный доступ?",
    a: "Да, без регистрации у каждой системы есть своя бесплатная часть: центральный аркан, схема и первый вопрос в каждой сфере матрицы, Солнце и Луна в натальной карте, тип и стратегия в бодиграфе, числа даты в нумерологии, карта дня, схема пары и абзац о главном по каждому взгляду.",
  },
];

export default function Page() {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative w-full" style={{ height: "var(--header-h)" }}>
        <Header />
      </div>
      <div className="mx-auto w-[min(1200px,92vw)] pb-20 pt-6 md:pt-12">
        <h1 className="text-center font-display text-text-primary" style={{ fontSize: "clamp(32px, 3.6vw, 60px)", lineHeight: 1.06 }}>Тарифы</h1>
        <p className="mx-auto mt-4 max-w-[760px] text-center text-[clamp(16px,1.2vw,19px)] text-text-secondary">
          Одна подписка открывает всё: шесть систем, каждый вопрос в каждом разборе, карту дня, сводку в Telegram и архив. Тарифы отличаются только числом людей и кредитами. Цена одна, без таймеров и «последних мест».
        </p>
        <div className="mt-10">
          <PlansGrid />
        </div>

        <h2 className="mt-20 font-display text-text-primary" style={{ fontSize: "clamp(26px, 2.6vw, 40px)" }}>Кредиты</h2>
        <div className="mt-4">
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
