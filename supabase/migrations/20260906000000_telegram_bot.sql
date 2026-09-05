-- ═══════════════════════════════════════════════════════════════════
-- Очередь 3: телеграм-бот — привязки и архив сводок
-- ═══════════════════════════════════════════════════════════════════
--
-- Бот живёт внутри этого же проекта: общая база, общие тексты. Люди
-- заводятся на сайте, в кабинете; бот только выдаёт на каждого ссылку
-- вида t.me/bot?start=КОД и шлёт утреннюю сводку.
--
-- Нет токена в переменных окружения — бот выключен, таблицы просто
-- пустуют, сайт работает как обычно.

CREATE TABLE IF NOT EXISTS public.bot_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- владелец профиля
  person_id    uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  code         text NOT NULL UNIQUE,           -- код в ссылке привязки
  chat_id      bigint,                         -- null, пока «Старт» не нажали
  tz           text NOT NULL DEFAULT 'Europe/Moscow',
  topics       text[] NOT NULL DEFAULT ARRAY['matrix','tarot','numerology'],
  active       boolean NOT NULL DEFAULT true,  -- отписка кнопкой в самом боте
  blocked      boolean NOT NULL DEFAULT false, -- человек заблокировал бота
  revoked_at   timestamptz,                    -- владелец отозвал: код погашен навсегда
  bound_at     timestamptz,
  -- Местная дата последней ушедшей сводки: по ней видно, слали ли сегодня.
  last_sent_day date,
  -- Сколько сводок ушло: по нему решается, пора ли добавить кнопку
  -- «Посчитать свой полный разбор» тем, кто на сайте не был.
  sent_count   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Один чат может вести несколько человек (свой профиль и профили семьи),
-- но одного и того же человека дважды в один чат не подключить.
CREATE UNIQUE INDEX IF NOT EXISTS bot_links_chat_person
  ON public.bot_links (chat_id, person_id) WHERE chat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bot_links_owner ON public.bot_links (user_id);
-- По этому индексу задача по расписанию выбирает, кому пора слать.
CREATE INDEX IF NOT EXISTS bot_links_due
  ON public.bot_links (last_sent_day) WHERE chat_id IS NOT NULL AND active AND NOT blocked AND revoked_at IS NULL;

ALTER TABLE public.bot_links ENABLE ROW LEVEL SECURITY;

-- Владелец видит и правит свои привязки — из кабинета. Сам бот работает
-- сервисным ключом: у чата в телеграме сессии Supabase нет и быть не может.
DROP POLICY IF EXISTS bot_links_own ON public.bot_links;
CREATE POLICY bot_links_own ON public.bot_links
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- Архив сводок
--
-- Остаётся у человека НАВСЕГДА, даже после отмены подписки: новые
-- перестают приходить, а прочитанное никуда не девается. Поэтому архив
-- не привязан к строке привязки — её могут отозвать — и переживает
-- удаление профиля: ссылки обнуляются, текст остаётся.
CREATE TABLE IF NOT EXISTS public.bot_digests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  person_id  uuid REFERENCES public.people(id) ON DELETE SET NULL,
  chat_id    bigint NOT NULL,
  day        date NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bot_digests_chat_day ON public.bot_digests (chat_id, person_id, day);
CREATE INDEX IF NOT EXISTS bot_digests_chat ON public.bot_digests (chat_id, day DESC);

ALTER TABLE public.bot_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_digests_own ON public.bot_digests;
CREATE POLICY bot_digests_own ON public.bot_digests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
