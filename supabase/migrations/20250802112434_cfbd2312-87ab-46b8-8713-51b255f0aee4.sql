-- Fix RLS policies for users table to allow viewing other users for messaging

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create new policies that allow users to see each other for messaging
CREATE POLICY "Users can view basic info of all users"
ON public.users
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.users  
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
ON public.users
FOR ALL
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "System can create users"
ON public.users
FOR INSERT
WITH CHECK (true);