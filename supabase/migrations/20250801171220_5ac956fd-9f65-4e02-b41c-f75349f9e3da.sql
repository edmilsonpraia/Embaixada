-- Criar usuário admin diretamente na tabela auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'admin@embaixada.ao',
  crypt('123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Administrador Sistema"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@embaixada.ao');

-- Criar usuário funcionário
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
SELECT 
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'funcionario@embaixada.ao',
  crypt('123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Funcionário Sistema"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'funcionario@embaixada.ao');

-- Criar identities correspondentes
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  email
)
SELECT 
  'admin@embaixada.ao',
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@embaixada.ao"}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW(),
  'admin@embaixada.ao'
WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'admin@embaixada.ao');

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  email
)
SELECT 
  'funcionario@embaixada.ao',
  '00000000-0000-0000-0000-000000000002'::uuid,
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"funcionario@embaixada.ao"}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW(),
  'funcionario@embaixada.ao'
WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider_id = 'funcionario@embaixada.ao');