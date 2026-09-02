ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_owner AND NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_referral_code_trg ON public.profiles;
CREATE TRIGGER profiles_referral_code_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_referral_code();

UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE is_owner AND referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.referral_count(_code text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.profiles
  WHERE _code IS NOT NULL AND referred_by = _code;
$$;

GRANT EXECUTE ON FUNCTION public.referral_count(text) TO authenticated;