-- ═══════════════════════════════════════════════════════════════════
-- Очередь 4, шаг 2: координаты и часовой пояс места рождения
-- ═══════════════════════════════════════════════════════════════════
--
-- Натальной карте и дизайну человека нужны не название места, а его
-- координаты (для домов и асцендента) и часовой пояс IANA (чтобы перевести
-- местное время рождения в UTC с учётом декретного и летнего времени).
--
-- Место по-прежнему хранится строкой birth_place — так его видит человек.
-- Рядом появляются четыре поля, которые заполняются, когда место выбрано
-- из справочника (GeoNames). Если место введено вручную и не распознано,
-- поля остаются пустыми, и расчёт честно скажет, что дома не определены.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_place_id integer,           -- id места в GeoNames
  ADD COLUMN IF NOT EXISTS birth_lat      double precision CHECK (birth_lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS birth_lon      double precision CHECK (birth_lon BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS birth_tz       text;              -- пояс IANA, например Europe/Moscow

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS birth_place_id integer,
  ADD COLUMN IF NOT EXISTS birth_lat      double precision CHECK (birth_lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS birth_lon      double precision CHECK (birth_lon BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS birth_tz       text;

-- Политики RLS на строки уже есть, новые столбцы под них попадают автоматически.
