CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Мой профиль',
  birth_date date,
  birth_time time,
  birth_place text,
  is_owner boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_user_id_idx ON public.profiles (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);