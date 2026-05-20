USE court;

-- Add wallet_balance column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;

-- Update existing users to have 0.00 balance
UPDATE users SET wallet_balance = 0.00 WHERE wallet_balance IS NULL; 