# Моя Эра — фронтенд на Next.js

Веб-сервис самопознания: шесть систем (матрица судьбы, натальная карта, дизайн человека,
нумерология, таро, совместимость) по дате рождения в одном профиле.

Проект перенесён с конструктора Lovable (TanStack Start + Vite) на **Next.js 16, App Router**.
Продуктовые и визуальные решения описаны в `docs/product-brief.md`, история проекта — в `docs/handover.md`.

## Запуск

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production-сборка
npm start          # запуск собранного
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

Node.js 20+. Переменные окружения не обязательны; для канонических ссылок и OG-тегов
можно задать `NEXT_PUBLIC_SITE_URL` (см. `.env.example`).

## Стек

| Что | Чем |
|---|---|
| Фреймворк | Next.js 16 (App Router, React 19, TypeScript) |
| Стили | Tailwind CSS 4 + CSS-переменные дизайн-системы в `src/app/globals.css` |
| Шрифты | Forum, Onest, JetBrains Mono, Noto Sans Symbols 2 — самостоятельный хостинг, `public/fonts` + `src/app/fonts.css` |
| Данные | Пока локальная заглушка (`src/lib/backend.ts`), см. раздел «Бэкенд» |

Сторонних UI-библиотек нет: все компоненты написаны руками, без shadcn/Radix.

## Структура

```
src/
  app/                      маршруты (App Router)
    layout.tsx              корневой layout: шрифты, метаданные
    globals.css             дизайн-система: палитра, токены, все custom-стили
    fonts.css               @font-face локальных шрифтов
    page.tsx + HomePage.tsx главная
    matrica-sudby/          страницы шести направлений: page.tsx (metadata) + <Name>Page.tsx (клиентский компонент)
    natalnaya-karta/
    dizayn-cheloveka/
    numerologiya/
    taro/
    sovmestimost/
    login/ register/        авторизация
    checkout/               оформление подписки (?plan=trial|sub&period=…)
    cabinet/                личный кабинет; layout.tsx — защита: без сессии → /login
    cabinet/[id]/           страница разбора по направлению
    about/ offer/ privacy/ consent/ subscription-terms/   юридические страницы-заготовки
    not-found.tsx error.tsx
  components/
    hero/                   первый экран: колесо направлений, звёздное поле, заголовок, хедер
    landing/                блоки главной: три шага, схема расчёта, сетка систем, отзывы, тарифы, FAQ, подвал
    direction/              общий шаблон страницы направления, калькулятор даты, кнопка полного разбора
    quick-calc/             расчёт центрального аркана с орбитами
    tarot/                  переворачивающаяся карта
    common/                 звёздные поля, переход-дуга между секциями
    legal/                  шаблон юридической страницы
  lib/
    arcana.ts               22 аркана и ЕДИНАЯ функция свёртки (см. ниже)
    numerology.ts natal.ts  число пути, квадрат Пифагора, знак Солнца
    directions.ts           единый массив шести направлений (id, title, desc, image, path)
    directionLines.ts       тексты разделов разбора по направлениям
    plans.ts                тарифы и периоды
    backend.ts              слой данных (авторизация, профили) — сейчас локальная заглушка
    useAuth.ts profile.ts   хук сессии и создание профиля владельца
    pendingBirth.ts referral.ts   дата рождения до регистрации, реферальная ссылка
  hooks/                    use-reduced-motion, use-mobile
public/
  images/                   иллюстрации направлений, логотип, рубашка карт, аватары отзывов
  fonts/                    woff2
supabase/migrations/        схема таблицы profiles из Lovable — для будущего подключения
docs/                       продуктовый бриф и передаточный документ
```

## Что важно знать

**Единые массивы данных.** Всё, что используется больше одного раза, живёт в одном месте:
`directions`, `arcana`, `sunSigns`, `lifePath`, `reviews`. Не копировать.

**Функция свёртки одна на весь проект** (`reduceTo22` в `src/lib/arcana.ts`). Она используется в расчёте
матрицы, нумерологии, совместимости и в демонстрационной схеме. Не переписывать — расчёты разойдутся.

**Контрольная дата 26 июля 1990:** центральный аркан 5 Иерофант, базовые числа 8, 7, 19, 7,
число пути 7, знак Солнца Лев. Проверять после любой правки расчётов.

**Цвета только через CSS-переменные** (`globals.css`, блок `:root`). Захардкоженных hex в компонентах быть не должно.
Сиреневый `--accent` — только заливкой; для текста и ссылок `--text-accent` (контраст).

**Тексты нигде не обещают предсказание будущего** — это условие для эквайринга и рекламы. Подробнее в брифе, разделы 3.2 и 10.

**`prefers-reduced-motion`** отключает ротацию заголовка, автовращение колеса и дыхание свечения.

## Бэкенд

Авторизация и профили изолированы в `src/lib/backend.ts` за интерфейсом `Backend`:

```ts
backend.auth.getSession / onAuthStateChange / signIn / signUp / signOut
backend.profiles.getOwner / insert / update / myReferralCount
```

Сейчас это **заглушка на localStorage**: воронку регистрация → кабинет → чекаут можно пройти целиком без сервера,
данные живут только в браузере. Для боевой версии заменяется реализация внутри этого файла
(например, на Supabase — схема `profiles` лежит в `supabase/migrations`, включая реферальные коды и RLS-политики).
Остальной код к хранилищу не привязан.

Не сделано и не входит во фронтенд: приём платежей (ЮKassa), генерация полных разборов, расчёт эфемерид
для натальной карты и дизайна человека (нужен сервер и лицензия Swiss Ephemeris либо внешний API).
Кнопки оплаты должны оставаться неактивными, пока разборы реально не генерируются.

## Что изменилось при переносе с Lovable

- TanStack Router → App Router: `createFileRoute` заменён на `page.tsx` с `metadata`; `Link`/`useNavigate` → `next/link`, `next/navigation`.
- Защищённая группа `_authenticated` → `app/cabinet/layout.tsx`.
- Картинки с CDN Lovable (`*.asset.json`) → файлы в `public/images`.
- Google Fonts → локальные woff2 (надёжнее для RU-трафика, нет внешнего запроса).
- Supabase-клиент и серверные middleware Lovable удалены; вместо них — `backend.ts`.
- 46 неиспользуемых shadcn-компонентов и их зависимости удалены.
- Исправлено горизонтальное переполнение на мобильном на `/checkout` и `/dizayn-cheloveka`.

`npm run lint` выдаёт предупреждения правил React Compiler (`set-state-in-effect`) — это унаследованный
паттерн «прочитать `window`/`localStorage` в эффекте и записать в state». Работает корректно, при желании
рефакторится на `useSyncExternalStore`.
