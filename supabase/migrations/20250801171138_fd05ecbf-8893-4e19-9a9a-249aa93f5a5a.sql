-- Create admin user using extensions
SELECT auth.signup(
  'admin@embaixada.ao',
  '123456',
  '{"full_name": "Administrador Sistema"}'::jsonb
);

-- Create officer user using extensions  
SELECT auth.signup(
  'funcionario@embaixada.ao',
  '123456',
  '{"full_name": "Funcionário Sistema"}'::jsonb
);