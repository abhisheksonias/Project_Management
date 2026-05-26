-- Remove any potential unique constraints on work_logs that might prevent multiple entries
-- for the same user, project, and task combination

-- Check if there are any unique constraints and drop them
DO $$ 
BEGIN
    -- Drop any existing unique constraints on work_logs table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'work_logs' 
        AND constraint_type = 'UNIQUE'
        AND table_schema = 'public'
    ) THEN
        -- Get constraint names and drop them
        FOR constraint_name IN 
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'work_logs' 
            AND constraint_type = 'UNIQUE'
            AND table_schema = 'public'
        LOOP
            EXECUTE 'ALTER TABLE public.work_logs DROP CONSTRAINT IF EXISTS ' || constraint_name;
        END LOOP;
    END IF;
END $$;

-- Ensure the table allows multiple work logs for the same user, project, and task
-- This is the expected behavior - users should be able to log multiple time entries
-- for the same task on different occasions
