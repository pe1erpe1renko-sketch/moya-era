import Link from "next/link";
import { directions } from "@/lib/directions";

const SERVICE = [
  { label: "О сервисе", to: "/about" as const },
  { label: "Как это работает", hash: "/#how" },
  { label: "Тарифы", hash: "/#pricing" },
  { label: "Вопросы", hash: "/#faq" },
];

const DOCS = [
  { label: "Публичная оферта", to: "/offer" as const },
  { label: "Политика обработки персональных данных", to: "/privacy" as const },
  { label: "Согласие на обработку данных", to: "/consent" as const },
  { label: "Условия подписки и возврата", to: "/subscription-terms" as const },
];

const colTitle =
  "text-text-secondary text-[13px] uppercase tracking-[0.08em]";
const linkCls =
  "text-text-secondary hover:text-text-accent text-[14px] transition-colors";

export function Footer() {
  return (
    <footer
      className="w-full border-t bg-black"
      style={{ borderColor: "color-mix(in srgb, var(--border) 40%, transparent)" }}
    >
      <div
        className="mx-auto w-full max-w-[1320px] pb-8 pt-[72px]"
        style={{ paddingLeft: "clamp(24px, 5vw, 80px)", paddingRight: "clamp(24px, 5vw, 80px)" }}
      >
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div
              className="font-display text-text-primary"
              style={{ fontSize: "clamp(20px, 1.6vw, 26px)", letterSpacing: "0.02em" }}
            >
              Моя Эра
            </div>
            <p className="mt-[14px] max-w-[280px] text-[14px] text-text-secondary">
              Шесть систем считают одного человека и складываются в один профиль
            </p>
            <div className="mt-6 flex flex-col gap-[10px]">
              <a href="https://t.me/" className="text-text-accent text-[14px] underline-offset-4 hover:underline">
                Telegram
              </a>
              <a href="mailto:hello@moyaera.ru" className="text-text-accent text-[14px] underline-offset-4 hover:underline">
                hello@moyaera.ru
              </a>
            </div>
            <p className="mt-6 text-[12px] text-text-secondary opacity-70">
              Оплата картами Мир, Visa, Mastercard
            </p>
          </div>

          {/* Directions */}
          <nav>
            <div className={colTitle}>НАПРАВЛЕНИЯ</div>
            <div className="mt-[18px] flex flex-col gap-3">
              {directions.map((d) => (
                <Link key={d.id} href={d.path} className={linkCls}>
                  {d.title}
                </Link>
              ))}
            </div>
          </nav>

          {/* Service */}
          <nav>
            <div className={colTitle}>СЕРВИС</div>
            <div className="mt-[18px] flex flex-col gap-3">
              {SERVICE.map((s) =>
                s.to ? (
                  <Link key={s.label} href={s.to} className={linkCls}>
                    {s.label}
                  </Link>
                ) : (
                  <a key={s.label} href={s.hash} className={linkCls}>
                    {s.label}
                  </a>
                ),
              )}
            </div>
          </nav>

          {/* Documents */}
          <nav>
            <div className={colTitle}>ДОКУМЕНТЫ</div>
            <div className="mt-[18px] flex flex-col gap-3">
              {DOCS.map((d) => (
                <Link key={d.label} href={d.to} className={linkCls}>
                  {d.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div
          className="mt-12 border-t pt-7"
          style={{ borderColor: "color-mix(in srgb, var(--border) 30%, transparent)" }}
        >
          <p className="text-[12px] text-text-secondary opacity-70">
            ИП [ФАМИЛИЯ ИМЯ ОТЧЕСТВО] · ИНН [__________] · ОГРНИП [_______________]
            <br />
            [Адрес регистрации]
          </p>
          <p className="mt-3 max-w-[900px] text-[12px] text-text-secondary opacity-70">
            Моя Эра — сервис самопознания и развлечения. Разборы описывают качества и
            склонности и не являются предсказанием событий, медицинской, психологической,
            юридической или финансовой консультацией.
          </p>
          <p className="mt-3 text-[12px] text-text-secondary opacity-50">© 2026 Моя Эра</p>
        </div>
      </div>
    </footer>
  );
}
