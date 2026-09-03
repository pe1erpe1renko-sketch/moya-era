-- ═══════════════════════════════════════════════════════════════════
-- «Моя Эра» — ядро продукта: люди, тарифы, подписки, кредиты, тексты, чат
-- ═══════════════════════════════════════════════════════════════════
--
-- Модель оплаты (решение от 03.09.2026):
--   единица учёта — ПРОФИЛЬ ЧЕЛОВЕКА (people). Тариф задаёт, сколько
--   профилей открыто (1 / 5 / без ограничений). Подписка открывает все
--   системы и все типы разбора по датам своих людей.
--   КРЕДИТЫ — только на то, что реально стоит денег: сообщения наставнику.
--   Пакет кредитов входит в тариф, докупается отдельно.
--
-- Тексты разборов (matrix_texts) — общие для всех, персональных данных
-- не содержат: ключ = слот + аркан. Пишутся только с сервера.

-- ───────────────────────────────────────────────────────────────────
-- 1. ЛЮДИ
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.people (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text NOT NULL,
  relation    text NOT NULL DEFAULT 'other'
              CHECK (relation IN ('self','partner','child','mother','father','friend','colleague','other')),
  birth_date  date NOT NULL,
  birth_time  time,
  birth_place text,
  sex         text CHECK (sex IN ('м','ж')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS people_user_id_idx ON public.people (user_id);
-- Один «я» на аккаунт.
CREATE UNIQUE INDEX IF NOT EXISTS people_one_self_per_user
  ON public.people (user_id) WHERE relation = 'self';

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;

CREATE POLICY people_select_own ON public.people FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY people_insert_own ON public.people FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY people_update_own ON public.people FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY people_delete_own ON public.people FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- 2. ТАРИФЫ И ПАКЕТЫ КРЕДИТОВ — настраиваются в базе, не в коде
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id              text PRIMARY KEY,                 -- 'basic' | 'family' | 'pro'
  title           text NOT NULL,
  subtitle        text NOT NULL DEFAULT '',
  max_people      int,                              -- NULL = без ограничений
  monthly_credits int NOT NULL DEFAULT 0,           -- кредитов в месяц
  price_month     int NOT NULL,                     -- ₽
  price_year      int NOT NULL,                     -- ₽ за год целиком
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort            int NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.credit_packs (
  id       text PRIMARY KEY,                        -- 'pack_50'
  credits  int NOT NULL,
  price    int NOT NULL,                            -- ₽
  sort     int NOT NULL DEFAULT 0,
  active   boolean NOT NULL DEFAULT true
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.plans, public.credit_packs TO anon, authenticated;
GRANT ALL ON public.plans, public.credit_packs TO service_role;
CREATE POLICY plans_public_read ON public.plans FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY packs_public_read ON public.credit_packs FOR SELECT TO anon, authenticated USING (active);

-- Стартовые значения. ЦИФРЫ — ДЛЯ ОБСУЖДЕНИЯ, меняются UPDATE-ом без деплоя.
INSERT INTO public.plans (id, title, subtitle, max_people, monthly_credits, price_month, price_year, features, sort) VALUES
  ('basic',  'Базовый',  'Все шесть систем — для себя',            1,    30,  590,  4900,
     '["Все шесть систем и все типы разбора по своей дате","Аркан дня, личный год, календарь","30 сообщений наставнику в месяц"]'::jsonb, 1),
  ('family', 'Семейный', 'До пяти человек и совместимости между ними', 5, 100,  990,  8900,
     '["До пяти человек: партнёр, дети, родители","Совместимость, детская, мама и ребёнок","100 сообщений наставнику в месяц"]'::jsonb, 2),
  ('pro',    'Практик',  'Без ограничений — для консультантов',    NULL, 300, 4900, 39000,
     '["Любое число людей и разборов","PDF-разборы под вашим именем","300 сообщений наставнику в месяц","Приоритетная поддержка"]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credit_packs (id, credits, price, sort) VALUES
  ('pack_50',  50,  290, 1),
  ('pack_150', 150, 690, 2),
  ('pack_500', 500, 1900, 3)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 3. ПОДПИСКИ
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id            text NOT NULL REFERENCES public.plans (id),
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('trial','active','past_due','canceled','expired')),
  period             text NOT NULL DEFAULT 'month' CHECK (period IN ('month','year')),
  started_at         timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  canceled_at        timestamptz,
  provider           text,                          -- 'yookassa' | 'manual'
  provider_ref       text,                          -- id подписки/платежа у провайдера
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id, current_period_end DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
-- Пользователь только читает: подписки создаёт сервер после оплаты.
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Активная подписка пользователя (или NULL).
CREATE OR REPLACE FUNCTION public.active_subscription(_user uuid)
RETURNS public.subscriptions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM public.subscriptions s
  WHERE s.user_id = _user
    AND s.status IN ('trial','active','past_due')
    AND s.current_period_end > now()
  ORDER BY s.current_period_end DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.active_subscription(uuid) TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────
-- 4. КРЕДИТЫ — журнал, баланс = сумма
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits_ledger (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  delta      int NOT NULL,
  reason     text NOT NULL
             CHECK (reason IN ('plan_grant','pack_purchase','welcome','chat_message','refund','admin')),
  ref        text,                                  -- id сообщения, платежа и т.п.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credits_ledger_user_idx ON public.credits_ledger (user_id, created_at DESC);

ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.credits_ledger TO authenticated;
GRANT ALL ON public.credits_ledger TO service_role;
CREATE POLICY credits_select_own ON public.credits_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.credit_balance(_user uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::int FROM public.credits_ledger WHERE user_id = _user;
$$;
REVOKE ALL ON FUNCTION public.credit_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_balance(uuid) TO authenticated, service_role;

-- Атомарное списание: возвращает новый баланс или -1, если кредитов нет.
-- Вызывается только сервером (service_role) из маршрута чата.
CREATE OR REPLACE FUNCTION public.spend_credit(_user uuid, _reason text, _ref text)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_user::text));
  SELECT public.credit_balance(_user) INTO bal;
  IF bal < 1 THEN
    RETURN -1;
  END IF;
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref) VALUES (_user, -1, _reason, _ref);
  RETURN bal - 1;
END;
$$;
REVOKE ALL ON FUNCTION public.spend_credit(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credit(uuid, text, text) TO service_role;

-- Приветственные кредиты новому пользователю — «первые сообщения бесплатно».
CREATE OR REPLACE FUNCTION public.grant_welcome_credits()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref)
  VALUES (NEW.id, 5, 'welcome', 'signup');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_welcome_credits();

-- ───────────────────────────────────────────────────────────────────
-- 5. ТЕКСТЫ РАЗБОРОВ — кэш генерации, общий для всех
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matrix_texts (
  key        text PRIMARY KEY,                      -- 'money_channel_main_20', 'day_10_21_2026-08-25'
  body       text NOT NULL,
  version    int NOT NULL,                          -- PROMPT_VERSION на момент генерации
  model      text,
  source     text NOT NULL DEFAULT 'generated' CHECK (source IN ('seed','generated','manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matrix_texts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.matrix_texts TO anon, authenticated;
GRANT ALL ON public.matrix_texts TO service_role;
-- Читать можно всем: в текстах нет персональных данных. Доступ к платным
-- вопросам решается на сервере до выдачи ключа. Писать — только сервер.
CREATE POLICY texts_public_read ON public.matrix_texts FOR SELECT TO anon, authenticated USING (true);

-- ───────────────────────────────────────────────────────────────────
-- 6. ЧАТ С НАСТАВНИКОМ
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  person_id  uuid REFERENCES public.people (id) ON DELETE SET NULL,
  title      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES public.chat_threads (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user','assistant')),
  content    text NOT NULL,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_threads_user_idx ON public.chat_threads (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON public.chat_messages (thread_id, created_at);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_threads, public.chat_messages TO service_role;

CREATE POLICY threads_own ON public.chat_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY messages_read_own ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Сообщения пишет только сервер: он же списывает кредит.

-- ───────────────────────────────────────────────────────────────────
-- 7. ИСТОРИЯ РАЗБОРОВ — «Мои разборы» в кабинете
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.readings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  calc_type      text NOT NULL,                     -- slug типа: 'matrica', 'sovmestimost', ...
  dates          text[] NOT NULL,                   -- ['1998-07-13'] или две даты
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, calc_type, dates)
);

CREATE INDEX IF NOT EXISTS readings_user_idx ON public.readings (user_id, last_opened_at DESC);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readings TO authenticated;
GRANT ALL ON public.readings TO service_role;
CREATE POLICY readings_own ON public.readings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
