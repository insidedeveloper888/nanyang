BEGIN;

CREATE TABLE IF NOT EXISTS public.ton_rules_backup AS TABLE public.ton_rules WITH NO DATA;
INSERT INTO public.ton_rules_backup SELECT * FROM public.ton_rules;

DELETE FROM public.ton_rules WHERE tyre_count IS NULL;

WITH to_keep AS (
  SELECT DISTINCT ON (tyre_count) id
  FROM public.ton_rules
  ORDER BY tyre_count,
           CASE WHEN active IS NOT FALSE THEN 1 ELSE 0 END DESC,
           id DESC
)
DELETE FROM public.ton_rules t
WHERE t.id NOT IN (SELECT id FROM to_keep)
  AND t.tyre_count IS NOT NULL;

ALTER TABLE public.ton_rules DROP CONSTRAINT IF EXISTS ton_rules_tyre_count_product_key;
DROP INDEX IF EXISTS public.ton_rules_tyre_count_product_idx;

ALTER TABLE public.ton_rules DROP COLUMN IF EXISTS product;

ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS active boolean;
ALTER TABLE public.ton_rules ALTER COLUMN active SET DEFAULT TRUE;
ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS estimated_ton numeric;
ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS tyre_count integer;
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ton_rules ALTER COLUMN tyre_count TYPE integer USING NULLIF(tyre_count::integer, NULL);
  EXCEPTION WHEN others THEN
    NULL;
  END;
END$$;

ALTER TABLE public.ton_rules ALTER COLUMN tyre_count SET NOT NULL;

DO $$
DECLARE
  col_attnum integer;
  uniq_exists boolean;
BEGIN
  SELECT attnum INTO col_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.ton_rules'::regclass
    AND attname = 'tyre_count';

  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = 'public.ton_rules'::regclass
      AND i.indisunique = true
      AND i.indkey = ARRAY[col_attnum]::int2vector
  ) INTO uniq_exists;

  IF NOT uniq_exists THEN
    BEGIN
      ALTER TABLE public.ton_rules ADD CONSTRAINT ton_rules_tyre_count_unique UNIQUE (tyre_count);
    EXCEPTION WHEN others THEN
      BEGIN
        WITH to_keep AS (
          SELECT DISTINCT ON (tyre_count) id
          FROM public.ton_rules
          ORDER BY tyre_count,
                   CASE WHEN active IS NOT FALSE THEN 1 ELSE 0 END DESC,
                   id DESC
        )
        DELETE FROM public.ton_rules t
        WHERE t.id NOT IN (SELECT id FROM to_keep)
          AND t.tyre_count IS NOT NULL;

        BEGIN
          ALTER TABLE public.ton_rules ADD CONSTRAINT ton_rules_tyre_count_unique UNIQUE (tyre_count);
        EXCEPTION WHEN others THEN
          CREATE UNIQUE INDEX IF NOT EXISTS ton_rules_tyre_count_unique_idx ON public.ton_rules (tyre_count);
        END;
      END;
    END;
  END IF;
END$$;

COMMIT;
