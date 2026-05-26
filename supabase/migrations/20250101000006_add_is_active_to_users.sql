-- Add is_active column to users table
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing users to be active by default
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Add comment to the column
COMMENT ON COLUMN users.is_active IS 'Indicates if the user account is active (true) or deactivated (false)';

-- Create an index for better performance when filtering by is_active
CREATE INDEX idx_users_is_active ON users(is_active);
