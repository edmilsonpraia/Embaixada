-- Create admin and officer users in auth.users table with proper authentication
-- Note: In a real production environment, these would be created through the signup flow

-- First, let's insert into auth.users (this is the main auth table)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'admin-user-id-12345',
    'authenticated',
    'authenticated',
    'admin@embaixada.ao',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrador Sistema"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
),
(
    '00000000-0000-0000-0000-000000000000',
    'officer-user-id-12345',
    'authenticated',
    'authenticated',
    'officer@embaixada.ao',
    crypt('123456', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Oficial Sistema"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
);

-- Insert into auth.identities for email provider
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES 
(
    'admin-identity-12345',
    'admin-user-id-12345',
    '{"sub": "admin-user-id-12345", "email": "admin@embaixada.ao"}',
    'email',
    NOW(),
    NOW(),
    NOW()
),
(
    'officer-identity-12345',
    'officer-user-id-12345',
    '{"sub": "officer-user-id-12345", "email": "officer@embaixada.ao"}',
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- Update the users table with the correct auth user IDs
UPDATE public.users 
SET id = 'admin-user-id-12345'
WHERE email = 'admin@embaixada.ao';

UPDATE public.users 
SET id = 'officer-user-id-12345'
WHERE email = 'officer@embaixada.ao';