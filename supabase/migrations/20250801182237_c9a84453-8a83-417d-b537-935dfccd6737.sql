-- Add missing fields to support_tickets table
ALTER TABLE public.support_tickets 
ADD COLUMN category text,
ADD COLUMN priority text DEFAULT 'medium';