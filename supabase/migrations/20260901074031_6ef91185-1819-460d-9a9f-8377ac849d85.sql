DROP FUNCTION IF EXISTS public.referral_count(text);

CREATE OR REPLACE FUNCTION public.my_referral_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.profiles p
  WHERE p.referred_by IS NOT NULL
    AND p.referred_by IN (
      SELECT o.referral_code FROM public.profiles o
      WHERE o.user_id = auth.uid() AND o.is_owner AND o.referral_code IS NOT NULL
    );
$$;

REVOKE ALL ON FUNCTION public.my_referral_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_count() TO authenticated;

REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_set_referral_code() FROM PUBLIC, anon, authenticated;