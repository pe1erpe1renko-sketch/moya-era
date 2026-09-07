-- ═══════════════════════════════════════════════════════════════════
-- ID клиента: МЭ-7K3F-92QD у каждого аккаунта
-- ═══════════════════════════════════════════════════════════════════
--
-- Постоянный короткий идентификатор, который человек называет в
-- поддержке. Выдаётся один раз при создании профиля владельца, не
-- меняется, уникален: уникальный индекс плюс повтор при совпадении.
--
-- Алфавит без похожих знаков — ни нуля с O, ни единицы с I и L: код
-- диктуют по телефону. Тот же алфавит в `src/lib/clientId.ts`; тест
-- сверяет их.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_client_id_key ON public.profiles (client_id);

CREATE OR REPLACE FUNCTION public.generate_client_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  raw text;
  candidate text;
  i int;
BEGIN
  LOOP
    raw := '';
    FOR i IN 1..8 LOOP
      raw := raw || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    candidate := 'МЭ-' || substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE client_id = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_owner AND NEW.client_id IS NULL THEN
    NEW.client_id := public.generate_client_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_client_id_trg ON public.profiles;
CREATE TRIGGER profiles_client_id_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_client_id();

-- Тем, кто зарегистрировался раньше, ID выдаётся сейчас.
UPDATE public.profiles
SET client_id = public.generate_client_id()
WHERE is_owner AND client_id IS NULL;

-- Свой ID человек только читает; выдаёт его база.
REVOKE ALL ON FUNCTION public.generate_client_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_set_client_id() FROM PUBLIC, anon, authenticated;
