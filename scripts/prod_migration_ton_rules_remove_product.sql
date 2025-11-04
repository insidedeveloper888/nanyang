-- Production migration: remove product from ton_rules and enforce tyre_count mapping
-- How to use: copy-paste this whole script into your Supabase SQL editor (Production DB) and run.
-- Safe and idempotent where possible; includes backup + verification.

BEGIN;

-- 0) Safety backup of current ton_rules (structure + data)
CREATE TABLE IF NOT EXISTS public.ton_rules_backup AS TABLE public.ton_rules WITH NO DATA;
INSERT INTO public.ton_rules_backup SELECT * FROM public.ton_rules;

-- 1) Remove rows with NULL tyre_count to prepare for NOT NULL constraint
DELETE FROM public.ton_rules WHERE tyre_count IS NULL;

-- 2) Deduplicate to a single row per tyre_count
--    Preference order: active = TRUE first, then latest id
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

-- 3) Drop old unique/index that reference product (names may or may not exist)
ALTER TABLE public.ton_rules DROP CONSTRAINT IF EXISTS ton_rules_tyre_count_product_key;
DROP INDEX IF EXISTS public.ton_rules_tyre_count_product_idx;

-- 4) Drop the product column
ALTER TABLE public.ton_rules DROP COLUMN IF EXISTS product;

-- 5) Ensure columns exist with sensible defaults (idempotent)
ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS active boolean;
ALTER TABLE public.ton_rules ALTER COLUMN active SET DEFAULT TRUE;
ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS estimated_ton numeric;
ALTER TABLE public.ton_rules ADD COLUMN IF NOT EXISTS tyre_count integer;
-- Normalize types if necessary
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ton_rules ALTER COLUMN tyre_count TYPE integer USING NULLIF(tyre_count::integer, NULL);
  EXCEPTION WHEN others THEN
    -- ignore type change failures; assume correct type
    NULL;
  END;
END$$;

-- 6) Enforce tyre_count NOT NULL (single-key mapping)
ALTER TABLE public.ton_rules ALTER COLUMN tyre_count SET NOT NULL;

-- 7) Enforce uniqueness and add unique index by tyre_count (idempotent and robust)
-- Attempt to add the UNIQUE constraint; if it already exists, this will error, so we guard with a DO block.
DO $$
DECLARE
  col_attnum integer;
  uniq_exists boolean;
BEGIN
  -- Find column attnum
  SELECT attnum INTO col_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.ton_rules'::regclass
    AND attname = 'tyre_count';

  -- Check if a UNIQUE index already exists exactly on (tyre_count)
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = 'public.ton_rules'::regclass
      AND i.indisunique = true
      AND i.indkey = ARRAY[col_attnum]::int2vector
  ) INTO uniq_exists;

  IF NOT uniq_exists THEN
    BEGIN
      -- Prefer a table constraint (creates an underlying unique index automatically)
      ALTER TABLE public.ton_rules ADD CONSTRAINT ton_rules_tyre_count_unique UNIQUE (tyre_count);
    EXCEPTION WHEN others THEN
      -- If constraint creation fails (e.g. due to transient duplicates), deduplicate and try again
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

        -- Try constraint again; if still failing, create a UNIQUE index as a last resort
        BEGIN
          ALTER TABLE public.ton_rules ADD CONSTRAINT ton_rules_tyre_count_unique UNIQUE (tyre_count);
        EXCEPTION WHEN others THEN
          CREATE UNIQUE INDEX IF NOT EXISTS ton_rules_tyre_count_unique_idx ON public.ton_rules (tyre_count);
        END;
      END;
    END;
  END IF;
END$$;

-- Ensure a named unique index also exists (harmless if the table constraint already created one)
CREATE UNIQUE INDEX IF NOT EXISTS ton_rules_tyre_count_unique_idx ON public.ton_rules (tyre_count);

COMMIT;

-- 8) Verification queries (optional): run to confirm results after migration
-- SELECT * FROM public.ton_rules ORDER BY tyre_count;
-- SELECT COUNT(*) AS rules_count, COUNT(DISTINCT tyre_count) AS distinct_tyre_counts FROM public.ton_rules;
-- SELECT * FROM public.ton_rules_backup LIMIT 5;

-- 9) Note for production: if your app upserts into public.config_options with on_conflict="category,name",
--    ensure a UNIQUE target exists on (category, name) and that appropriate RLS policies are in place.
--    Suggested steps (run as a separate migration if needed):
--
--    -- Deduplicate to one row per (category, name) and enforce NOT NULL
--    -- WITH keep AS (
--    --   SELECT DISTINCT ON (category, name) id
--    --   FROM public.config_options
--    --   ORDER BY category, name, active DESC NULLS LAST, id DESC
--    -- )
--    -- DELETE FROM public.config_options t
--    -- WHERE t.id NOT IN (SELECT id FROM keep);
--    -- ALTER TABLE public.config_options ALTER COLUMN category SET NOT NULL;
--    -- ALTER TABLE public.config_options ALTER COLUMN name SET NOT NULL;
--    --
--    -- Add UNIQUE constraint/index for PostgREST upserts
--    -- DO $$
--    -- BEGIN
--    --   BEGIN
--    --     ALTER TABLE public.config_options ADD CONSTRAINT config_options_category_name_unique UNIQUE (category, name);
--    --   EXCEPTION WHEN others THEN
--    --     CREATE UNIQUE INDEX IF NOT EXISTS config_options_category_name_unique_idx ON public.config_options (category, name);
--    --   END;
--    -- END $$;
--    --
--    -- RLS policies (permit UI writes if using anon key)
--    -- ALTER TABLE public.config_options ENABLE ROW LEVEL SECURITY;
--    -- DO $$
--    -- BEGIN
--    --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='config_options' AND policyname='config_options_select_any') THEN
--    --     CREATE POLICY config_options_select_any ON public.config_options FOR SELECT USING (true);
--    --   END IF;
--    --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='config_options' AND policyname='config_options_insert_any') THEN
--    --     CREATE POLICY config_options_insert_any ON public.config_options FOR INSERT WITH CHECK (true);
--    --   END IF;
--    --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='config_options' AND policyname='config_options_update_any') THEN
--    --     CREATE POLICY config_options_update_any ON public.config_options FOR UPDATE USING (true) WITH CHECK (true);
--    --   END IF;
--    --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='config_options' AND policyname='config_options_delete_any') THEN
--    --     CREATE POLICY config_options_delete_any ON public.config_options FOR DELETE USING (true);
--    --   END IF;
--    -- END $$;

-- 10) Note for production: commission_rules used by Commission Manager UI
--     The UI upserts with on_conflict = 'pick_up,product,destination,valid_from'. Ensure:
--     - Keys pick_up/product/destination are NOT NULL
--     - Uniqueness exists on (pick_up, product, destination, valid_from)
--     - RLS policies allow SELECT/INSERT/UPDATE/DELETE for your chosen role
--     Suggested steps:
--     -- DELETE FROM public.commission_rules WHERE pick_up IS NULL OR product IS NULL OR destination IS NULL;
--     -- ALTER TABLE public.commission_rules ALTER COLUMN pick_up SET NOT NULL;
--     -- ALTER TABLE public.commission_rules ALTER COLUMN product SET NOT NULL;
--     -- ALTER TABLE public.commission_rules ALTER COLUMN destination SET NOT NULL;
--     -- WITH keep AS (
--     --   SELECT DISTINCT ON (pick_up, product, destination, valid_from) id
--     --   FROM public.commission_rules
--     --   ORDER BY pick_up, product, destination, valid_from, active DESC NULLS LAST, id DESC
--     -- )
--     -- DELETE FROM public.commission_rules t WHERE t.id NOT IN (SELECT id FROM keep);
--     -- DO $$ BEGIN
--     --   BEGIN
--     --     ALTER TABLE public.commission_rules ADD CONSTRAINT commission_rules_pu_pr_de_vf_unique UNIQUE (pick_up, product, destination, valid_from);
--     --   EXCEPTION WHEN others THEN
--     --     CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_pu_pr_de_vf_unique_idx ON public.commission_rules (pick_up, product, destination, valid_from);
--     --   END;
--     -- END $$;
--     -- ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
--     -- DO $$ BEGIN
--     --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_rules' AND policyname='commission_rules_select_any') THEN
--     --     CREATE POLICY commission_rules_select_any ON public.commission_rules FOR SELECT USING (true);
--     --   END IF;
--     --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_rules' AND policyname='commission_rules_insert_any') THEN
--     --     CREATE POLICY commission_rules_insert_any ON public.commission_rules FOR INSERT WITH CHECK (true);
--     --   END IF;
--     --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_rules' AND policyname='commission_rules_update_any') THEN
--     --     CREATE POLICY commission_rules_update_any ON public.commission_rules FOR UPDATE USING (true) WITH CHECK (true);
--     --   END IF;
--     --   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_rules' AND policyname='commission_rules_delete_any') THEN
--     --     CREATE POLICY commission_rules_delete_any ON public.commission_rules FOR DELETE USING (true);
--     --   END IF;
--     -- END $$;
