-- ═══════════════════════════════════════════════════════════════════
-- Живой расклад Таро: виды с ценами и сохранённые расклады
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. ВИДЫ РАСКЛАДОВ — рядом с тарифами и пакетами кредитов
--
-- Цены живут в базе по той же причине, что и цены тарифов: их меняют
-- UPDATE-ом, без деплоя. В коде остаются запасные значения — чтобы
-- расклады работали до первого наполнения таблицы.
CREATE TABLE IF NOT EXISTS public.spread_types (
  id       text PRIMARY KEY,              -- 'one' | 'three' | 'love' | 'big'
  title    text NOT NULL,
  cards    int  NOT NULL,                 -- сколько карт тянется
  credits  int  NOT NULL,                 -- сколько кредитов стоит
  sort     int  NOT NULL DEFAULT 0,
  active   boolean NOT NULL DEFAULT true
);

ALTER TABLE public.spread_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.spread_types TO anon, authenticated;
GRANT ALL ON public.spread_types TO service_role;
DROP POLICY IF EXISTS spread_types_public_read ON public.spread_types;
CREATE POLICY spread_types_public_read ON public.spread_types
  FOR SELECT TO anon, authenticated USING (active);

INSERT INTO public.spread_types (id, title, cards, credits, sort) VALUES
  ('one',   'Одна карта',      1,  1, 1),
  ('three', 'Три карты',       3,  3, 2),
  ('love',  'Отношения',       5,  4, 3),
  ('big',   'Большой расклад', 10, 7, 4)
ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 2. СОХРАНЁННЫЕ РАСКЛАДЫ
--
-- Человек заплатил кредитами — он должен иметь возможность вернуться и
-- перечитать. Поэтому расклад хранится целиком: и карты, и текст.
--
-- ОСТАЁТСЯ ПОСЛЕ ОТМЕНЫ ПОДПИСКИ, как и архив сводок бота: подписка
-- открывает новые расклады, а купленное остаётся купленным.
--
-- Адрес — по случайному коду, и страница закрыта от индексации: это
-- личный вопрос человека, ему не место в поиске.
CREATE TABLE IF NOT EXISTS public.spreads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,                                -- код в адресе
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind       text NOT NULL,                                       -- id из spread_types
  title      text NOT NULL,
  question   text NOT NULL,
  -- [{ arcanum, reversed, position: { id, label } }, …]
  cards      jsonb NOT NULL,
  body       text NOT NULL DEFAULT '',
  credits    int  NOT NULL DEFAULT 0,                             -- сколько списали
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spreads_user_created ON public.spreads (user_id, created_at DESC);

ALTER TABLE public.spreads ENABLE ROW LEVEL SECURITY;

-- Своё видно владельцу — для списка в кабинете. Страница по коду
-- собирается на сервере сервисным ключом: политика «читать всем»
-- позволила бы с анонимным ключом выгрузить таблицу целиком, то есть
-- все чужие вопросы разом.
DROP POLICY IF EXISTS spreads_select_own ON public.spreads;
CREATE POLICY spreads_select_own ON public.spreads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. СПИСАНИЕ НЕСКОЛЬКИХ КРЕДИТОВ СРАЗУ
--
-- У наставника списывается один кредит за сообщение, у расклада — до
-- семи. Вызвать `spend_credit` семь раз нельзя: это семь отдельных
-- транзакций, и на четвёртой может кончиться баланс — человек остался
-- бы и без кредитов, и без расклада.
--
-- Здесь всё в одной транзакции под тем же advisory-локом: либо списаны
-- все, либо ни одного.
CREATE OR REPLACE FUNCTION public.spend_credits(_user uuid, _amount int, _reason text, _ref text)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal int;
BEGIN
  IF _amount < 1 THEN
    RETURN -1;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_user::text));
  SELECT public.credit_balance(_user) INTO bal;
  IF bal < _amount THEN
    RETURN -1;
  END IF;
  INSERT INTO public.credits_ledger (user_id, delta, reason, ref) VALUES (_user, -_amount, _reason, _ref);
  RETURN bal - _amount;
END;
$$;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, int, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, int, text, text) TO service_role;
