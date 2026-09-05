-- ═══════════════════════════════════════════════════════════════════
-- Автопродление подписки + починка списаний за расклад
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 0. ПРИЧИНА «spread» В ЖУРНАЛЕ КРЕДИТОВ
--
-- Ограничение писалось до раскладов и знало только про наставника.
-- Списание за расклад в него не проходило: строка не записывалась,
-- функция возвращала ошибку, и человек оставался без расклада — при
-- живой базе и оплаченной подписке. Правится здесь, а не в старой
-- миграции: старые файлы не редактируем.
--
-- Список повторяется в `src/lib/creditReasons.ts`; тест сверяет их.
ALTER TABLE public.credits_ledger DROP CONSTRAINT IF EXISTS credits_ledger_reason_check;
ALTER TABLE public.credits_ledger ADD CONSTRAINT credits_ledger_reason_check
  CHECK (reason IN ('plan_grant','pack_purchase','welcome','chat_message','spread','refund','admin'));

-- ───────────────────────────────────────────────────────────────────
-- 1. ПОДПИСКА: ПРОДЛЕВАТЬ ЛИ И ЧЕМ ПЛАТИТЬ
--
-- `auto_renew` по умолчанию true — это состояние строки, а не решение
-- включить автосписание. Само списание выключено переменной окружения
-- (`BILLING_AUTO_RENEW`), и без неё задача не делает ничего. Так
-- сделано нарочно: до появления оферты с условиями автосписания
-- списывать нельзя, а когда оферта появится, переключается одна
-- переменная, а не тысяча строк в базе.
--
-- `payment_method_id` приходит из первого платежа: ЮKassa сохраняет
-- способ оплаты по `save_payment_method`, и по нему потом можно
-- списывать без участия человека.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method_id text;
-- Когда человека предупредили о ближайшем списании. Предупреждаем ДО,
-- а не после, и ровно один раз за период.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS renew_warned_for timestamptz;

-- ───────────────────────────────────────────────────────────────────
-- 2. ПОПЫТКИ ПРОДЛЕНИЯ — ОНИ ЖЕ ЗАЩИТА ОТ ДВОЙНОГО СПИСАНИЯ
--
-- Ключ идемпотентности — пара «подписка + конец оплаченного периода».
-- Задача по расписанию сначала занимает строку и только потом идёт в
-- банк: повторный запуск (а он бывает — Vercel может запустить задачу
-- дважды, и человек может нажать «повторить») упирается в UNIQUE и
-- уходит ни с чем. Второго платежа не будет.
--
-- Внутри строки счётчик попыток. Каждой попытке — свой ключ
-- идемпотентности в ЮKassa, поэтому повтор в пределах одной попытки
-- возвращает тот же платёж, а не создаёт новый.
CREATE TABLE IF NOT EXISTS public.subscription_renewals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  -- конец периода, за который платим: он же половина ключа
  period_end      timestamptz NOT NULL,
  attempt         int NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','succeeded','failed','given_up')),
  payment_id      text,
  error           text,
  next_attempt_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_end)
);

CREATE INDEX IF NOT EXISTS subscription_renewals_user_idx
  ON public.subscription_renewals (user_id, created_at DESC);

ALTER TABLE public.subscription_renewals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.subscription_renewals TO service_role;
-- Своё видно владельцу: человек имеет право знать, что с него пытались
-- списать и чем это кончилось. Пишет только сервер.
GRANT SELECT ON public.subscription_renewals TO authenticated;
DROP POLICY IF EXISTS subscription_renewals_select_own ON public.subscription_renewals;
CREATE POLICY subscription_renewals_select_own ON public.subscription_renewals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. ЗАНЯТЬ ПОПЫТКУ
--
-- Возвращает номер попытки, если продлевать можно, и 0, если нельзя:
-- уже продлено, ещё рано для следующей попытки или попытки исчерпаны.
-- Всё внутри одной транзакции — две задачи одновременно не разойдутся.
CREATE OR REPLACE FUNCTION public.claim_renewal(_sub uuid, _user uuid, _period_end timestamptz, _max_attempts int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.subscription_renewals;
BEGIN
  SELECT * INTO row FROM public.subscription_renewals
   WHERE subscription_id = _sub AND period_end = _period_end
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.subscription_renewals (subscription_id, user_id, period_end, attempt, status)
    VALUES (_sub, _user, _period_end, 1, 'pending');
    RETURN 1;
  END IF;

  -- Уже продлено или сдались — больше не трогаем.
  IF row.status IN ('succeeded', 'given_up') THEN
    RETURN 0;
  END IF;

  -- Платёж ещё висит: не создаём второй, дождёмся ответа банка.
  IF row.status = 'pending' THEN
    RETURN row.attempt;
  END IF;

  -- Неудача: ждём назначенного срока следующей попытки.
  IF row.next_attempt_at IS NOT NULL AND row.next_attempt_at > now() THEN
    RETURN 0;
  END IF;
  IF row.attempt >= _max_attempts THEN
    RETURN 0;
  END IF;

  UPDATE public.subscription_renewals
     SET attempt = row.attempt + 1, status = 'pending', error = NULL, updated_at = now()
   WHERE id = row.id;
  RETURN row.attempt + 1;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_renewal(uuid, uuid, timestamptz, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_renewal(uuid, uuid, timestamptz, int) TO service_role;
