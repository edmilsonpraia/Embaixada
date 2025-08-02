-- Create default admin user
INSERT INTO public.users (id, email, full_name, role, email_verified) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@embaixada.ao',
  'Administrador Sistema',
  'admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;

-- Create officer user
INSERT INTO public.users (id, email, full_name, role, email_verified) 
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'funcionario@embaixada.ao',
  'Funcionário Sistema',
  'officer',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;

-- Enable realtime for important tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;