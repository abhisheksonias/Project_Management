-- Add avatar_url column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN public.users.avatar_url IS 'URL to user profile picture stored in Supabase Storage';

