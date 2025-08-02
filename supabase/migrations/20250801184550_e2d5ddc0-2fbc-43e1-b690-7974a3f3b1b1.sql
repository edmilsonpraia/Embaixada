-- Insert basic document types if they don't exist
INSERT INTO document_types (id, name, description, required)
VALUES 
  (1, 'Passaporte', 'Cópia do passaporte válido', true),
  (2, 'Certificado Académico', 'Certificado de conclusão do ensino médio ou superior', true),
  (3, 'Atestado Médico', 'Atestado médico de aptidão', false),
  (4, 'Foto 3x4', 'Fotografia recente 3x4', true),
  (5, 'Comprovante de Residência', 'Comprovante de endereço atual', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required = EXCLUDED.required;