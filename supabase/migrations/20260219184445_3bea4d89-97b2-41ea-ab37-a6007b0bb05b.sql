
-- Add phone column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

-- Add DELETE policy for admins on users table
CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
USING (is_admin());
