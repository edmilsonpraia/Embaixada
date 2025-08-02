-- Fix the identities by adding provider_id
UPDATE auth.identities 
SET provider_id = CASE 
  WHEN user_id = '00000000-0000-0000-0000-000000000001' THEN 'admin@embaixada.ao'
  WHEN user_id = '00000000-0000-0000-0000-000000000002' THEN 'funcionario@embaixada.ao'
END
WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');