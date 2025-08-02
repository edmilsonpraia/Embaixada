-- Fix RLS policy for documents - allow admins/officers to see all documents
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Officers can update documents" ON documents;

-- Create new policies for documents
CREATE POLICY "Users can view their own documents" ON documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and officers can view all documents" ON documents 
FOR SELECT 
USING (get_user_role() = ANY(ARRAY['admin'::text, 'officer'::text]));

CREATE POLICY "Admins and officers can update documents" ON documents 
FOR UPDATE 
USING (get_user_role() = ANY(ARRAY['admin'::text, 'officer'::text]));

CREATE POLICY "Users can update their own pending documents" ON documents 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');