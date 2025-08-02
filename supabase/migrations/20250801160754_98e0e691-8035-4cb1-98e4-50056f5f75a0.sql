-- Security Fixes Migration: Comprehensive RLS and Security Hardening

-- 1. Fix database functions security (add proper search_path)
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action_type, table_name, record_id, metadata)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action_type, table_name, record_id, metadata)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action_type, table_name, record_id, metadata)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD));
  END IF;
  RETURN NULL;
END;
$function$;

-- 2. Create security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$;

-- 3. Enable RLS on document_types and add policies
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view document types"
ON public.document_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify document types"
ON public.document_types
FOR ALL
TO authenticated
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- 4. Enable RLS and create policies for announcement_recipients
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own announcement receipts"
ON public.announcement_recipients
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create announcement receipts"
ON public.announcement_recipients
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Users can update their own receipt status"
ON public.announcement_recipients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Enable RLS and create policies for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Officers and admins can create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Officers and admins can update announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('admin', 'officer'))
WITH CHECK (public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Only admins can delete announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (public.get_user_role() = 'admin');

-- 6. Enable RLS and create policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.get_user_role() = 'admin');

CREATE POLICY "System can create audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allows system to log events

-- 7. Enable RLS and create policies for document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document versions"
ON public.document_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_versions.document_id 
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create versions of their own documents"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_versions.document_id 
    AND documents.user_id = auth.uid()
  )
);

-- 8. Enable RLS and create policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages sent to or from them"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 9. Enable RLS and create policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins and officers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Enable RLS and create policies for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.get_user_role() IN ('admin', 'officer'));

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Officers and admins can update any ticket"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.get_user_role() IN ('admin', 'officer'))
WITH CHECK (public.get_user_role() IN ('admin', 'officer'));

-- 11. Add missing DELETE policy for documents
CREATE POLICY "Only admins can delete documents"
ON public.documents
FOR DELETE
TO authenticated
USING (public.get_user_role() = 'admin');

-- 12. Create storage policies for documents bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (public.get_user_role() = 'admin' OR auth.uid()::text = (storage.foldername(name))[1])
);