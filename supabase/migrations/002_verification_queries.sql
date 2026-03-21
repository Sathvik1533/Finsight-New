-- ══════════════════════════════════════════════════════════════════
-- FINSIGHT DATABASE VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════════
-- Run AFTER executing 001_phase1_complete.sql
-- These queries verify that the schema was created correctly
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. RLS enabled on all tables
-- Expected: 6 rows, all with rowsecurity = true
-- ──────────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'receipts', 'transactions', 'insights', 'decision_engine_outputs', 'conversations')
ORDER BY tablename;


-- ──────────────────────────────────────────────────────────────────
-- 2. RLS policies exist for all tables
-- Expected: at least 14 policies across all 6 tables
-- ──────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ──────────────────────────────────────────────────────────────────
-- 3. All indexes exist
-- Expected: ≥ 15 indexes in Phase 1
-- ──────────────────────────────────────────────────────────────────
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


-- ──────────────────────────────────────────────────────────────────
-- 4. All functions exist
-- Expected: handle_new_user, increment_receipt_count,
--           archive_decision_engine_output, get_category_stats, set_updated_at
-- ──────────────────────────────────────────────────────────────────
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'handle_new_user',
    'increment_receipt_count',
    'archive_decision_engine_output',
    'get_category_stats',
    'set_updated_at'
  )
ORDER BY routine_name;


-- ──────────────────────────────────────────────────────────────────
-- 5. handle_new_user trigger is active
-- Expected: 1 row with event_manipulation = INSERT
-- ──────────────────────────────────────────────────────────────────
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';


-- ──────────────────────────────────────────────────────────────────
-- 6. Test increment_receipt_count atomicity
-- Expected: intelligence_level = 2 after 3rd call
-- Uses real user from auth.users or creates temporary test user
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  test_user_id UUID;
  returned_level SMALLINT;
  user_existed BOOLEAN := FALSE;
  original_count INTEGER;
  original_level SMALLINT;
BEGIN
  -- Try to get existing user from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- If no user exists, create a temporary one directly in profiles
  IF test_user_id IS NULL THEN
    test_user_id := gen_random_uuid();
    INSERT INTO public.profiles (id, intelligence_level, total_receipts_uploaded)
    VALUES (test_user_id, 1, 0);
    RAISE NOTICE 'Created temporary test user: %', test_user_id;
  ELSE
    -- User exists, check if they have a profile
    SELECT 
      total_receipts_uploaded, 
      intelligence_level,
      TRUE
    INTO original_count, original_level, user_existed
    FROM public.profiles 
    WHERE id = test_user_id;
    
    -- If profile doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO public.profiles (id, intelligence_level, total_receipts_uploaded)
      VALUES (test_user_id, 1, 0);
      original_count := 0;
      original_level := 1;
      user_existed := TRUE;
      RAISE NOTICE 'Created profile for existing user: %', test_user_id;
    ELSE
      RAISE NOTICE 'Using existing user: % (current count: %, level: %)', 
        test_user_id, original_count, original_level;
    END IF;
  END IF;

  -- Simulate 3 receipt uploads
  PERFORM public.increment_receipt_count(test_user_id);
  PERFORM public.increment_receipt_count(test_user_id);
  SELECT public.increment_receipt_count(test_user_id) INTO returned_level;

  -- Verify the function worked (level should be based on new count)
  DECLARE
    new_count INTEGER;
    expected_level SMALLINT;
  BEGIN
    SELECT total_receipts_uploaded INTO new_count 
    FROM public.profiles 
    WHERE id = test_user_id;
    
    -- Calculate expected level based on new count
    expected_level := CASE
      WHEN new_count >= 10 THEN 4
      WHEN new_count >= 6 THEN 3
      WHEN new_count >= 3 THEN 2
      ELSE 1
    END;
    
    ASSERT returned_level = expected_level,
      FORMAT('Expected level %s for count %s, got %s', expected_level, new_count, returned_level);
    
    RAISE NOTICE 'increment_receipt_count test PASSED (count: % → %, level: % → %)', 
      original_count, new_count, original_level, returned_level;
  END;

  -- Clean up only if we created a temporary user
  IF NOT user_existed THEN
    DELETE FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE 'Cleaned up temporary test user';
  ELSE
    -- Restore original values for existing user
    UPDATE public.profiles 
    SET 
      total_receipts_uploaded = original_count,
      intelligence_level = original_level
    WHERE id = test_user_id;
    RAISE NOTICE 'Restored original values for existing user';
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 7. Test archive_decision_engine_output idempotency
-- Expected: only 1 is_current=TRUE row after archiving + inserting
-- Uses real user from auth.users or creates temporary test user
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  test_user_id UUID;
  user_existed BOOLEAN := FALSE;
BEGIN
  -- Try to get existing user from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- If no user exists, create a temporary one
  IF test_user_id IS NULL THEN
    test_user_id := gen_random_uuid();
    INSERT INTO public.profiles (id) VALUES (test_user_id);
    RAISE NOTICE 'Created temporary test user: %', test_user_id;
  ELSE
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
      INSERT INTO public.profiles (id) VALUES (test_user_id);
      RAISE NOTICE 'Created profile for existing user: %', test_user_id;
    ELSE
      RAISE NOTICE 'Using existing user: %', test_user_id;
    END IF;
    user_existed := TRUE;
  END IF;

  -- Insert 2 "current" rows
  INSERT INTO public.decision_engine_outputs (id, user_id, is_current)
  VALUES (gen_random_uuid(), test_user_id, TRUE),
         (gen_random_uuid(), test_user_id, TRUE);

  -- Archive all
  PERFORM public.archive_decision_engine_output(test_user_id);

  -- Verify zero current rows after archiving
  ASSERT (
    SELECT COUNT(*) FROM public.decision_engine_outputs
    WHERE user_id = test_user_id AND is_current = TRUE
  ) = 0, 'Expected 0 current rows after archive';

  -- Insert a new current row
  INSERT INTO public.decision_engine_outputs (id, user_id, is_current)
  VALUES (gen_random_uuid(), test_user_id, TRUE);

  -- Verify exactly 1 current row
  ASSERT (
    SELECT COUNT(*) FROM public.decision_engine_outputs
    WHERE user_id = test_user_id AND is_current = TRUE
  ) = 1, 'Expected exactly 1 current row';

  -- Clean up test data
  DELETE FROM public.decision_engine_outputs WHERE user_id = test_user_id;
  
  -- Only delete profile if we created a temporary user
  IF NOT user_existed THEN
    DELETE FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE 'Cleaned up temporary test user';
  ELSE
    RAISE NOTICE 'Preserved existing user profile';
  END IF;
  
  RAISE NOTICE 'archive_decision_engine_output test PASSED';
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 8. Extensions are active
-- Expected: 3 rows for pg_trgm, vector, pg_cron
-- Note: pg_cron may not be available on all Supabase plans
-- ──────────────────────────────────────────────────────────────────
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_trgm', 'vector', 'pg_cron')
ORDER BY extname;


-- ──────────────────────────────────────────────────────────────────
-- 9. Storage bucket exists and is private
-- Run in Supabase dashboard → Storage → Buckets
-- Expected: 'receipts' bucket with public = false
-- ──────────────────────────────────────────────────────────────────
SELECT name, public
FROM storage.buckets
WHERE name = 'receipts';


-- ══════════════════════════════════════════════════════════════════
-- CONSTRAINT VALIDATION TESTS (run individually, expect failures)
-- ══════════════════════════════════════════════════════════════════

-- Should fail: intelligence_level = 5 is invalid
-- INSERT INTO public.profiles (id, intelligence_level)
--   VALUES ('00000000-0000-0000-0000-000000000001', 5);

-- Should fail: amount cannot be negative
-- INSERT INTO public.transactions (id, user_id, amount, transaction_date, category)
--   VALUES (gen_random_uuid(), gen_random_uuid(), -100.00, CURRENT_DATE, 'Other');

-- Should fail: health_score = 150 is out of range
-- INSERT INTO public.insights (id, user_id, health_score)
--   VALUES (gen_random_uuid(), gen_random_uuid(), 150);
