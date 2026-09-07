import type { ReactNode } from "react";
import { Header } from "@/components/hero/Header";
import { Footer } from "@/components/landing/Footer";

/**
 * ОБЩАЯ РАМКА СТРАНИЦ ПО ДАТЕ: шапка сверху, подвал снизу.
 *
 * Страницы карт (натальная, дизайн человека, нумерология, карта дня,
 * пара, сохранённый расклад) собираются на сервере и раньше выводили
 * только содержимое — без шапки и без подвала. Человек, пришедший из
 * поиска, оказывался на странице, с которой некуда уйти. Разбор матрицы
 * рисует шапку сам (он целиком клиентский), остальным нужна эта рамка.
 *
 * Отступ под шапку обязателен: она закреплена поверх страницы, и без
 * него заголовок уходил под неё.
 */
export function ChartShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen w-full bg-bg-page">
      <div className="relative h-[90px] w-full md:h-[110px]">
        <Header />
      </div>
      {children}
      <Footer />
    </main>
  );
}
