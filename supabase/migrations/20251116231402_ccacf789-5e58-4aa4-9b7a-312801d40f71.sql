-- Permitir que admins invalidem vouchers
CREATE POLICY "Admins can invalidate vouchers"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permitir que admins visualizem informações de usuários que usaram vouchers
CREATE POLICY "Admins can view all vouchers"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));