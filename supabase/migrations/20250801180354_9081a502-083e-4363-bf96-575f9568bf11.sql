-- Create notifications table for internal messaging system
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'announcement', 'sms', 'registration'
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sender_id UUID,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and officers can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (get_user_role() = ANY (ARRAY['admin'::text, 'officer'::text]));

CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (get_user_role() = 'admin'::text);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify admin of new user registrations
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM public.users 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- Create notification for admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, sender_id, metadata)
    VALUES (
      admin_user_id,
      'Novo Usuário Registrado',
      'Um novo usuário se registrou: ' || NEW.full_name || ' (' || NEW.email || ')',
      'registration',
      NEW.id,
      jsonb_build_object('new_user_id', NEW.id, 'user_name', NEW.full_name, 'user_email', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user notifications
CREATE TRIGGER on_user_registered
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

-- Create function to send announcements as notifications
CREATE OR REPLACE FUNCTION public.send_announcement_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Send notification to all users when new announcement is created
  FOR user_record IN SELECT id FROM public.users WHERE role = 'student' LOOP
    INSERT INTO public.notifications (user_id, title, message, type, sender_id, metadata)
    VALUES (
      user_record.id,
      'Novo Anúncio: ' || NEW.title,
      NEW.content,
      'announcement',
      NEW.author_id,
      jsonb_build_object('announcement_id', NEW.id, 'priority', NEW.priority, 'send_as_sms', NEW.send_as_sms)
    );
    
    -- Create announcement recipient record
    INSERT INTO public.announcement_recipients (user_id, announcement_id, sms_delivered)
    VALUES (user_record.id, NEW.id, NEW.send_as_sms);
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for announcement notifications
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.send_announcement_notifications();