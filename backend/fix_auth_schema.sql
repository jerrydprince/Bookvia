-- Run this in your Supabase Dashboard SQL Editor
-- This fixes the "Database error querying schema" caused by manual inserts into auth.users

UPDATE auth.users
SET 
  phone_change = COALESCE(phone_change, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  encrypted_password = COALESCE(encrypted_password, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');

-- Optional: You can verify the fix worked by checking if any NULLs remain in critical fields
-- SELECT email, phone, confirmation_token FROM auth.users WHERE confirmation_token IS NULL;
