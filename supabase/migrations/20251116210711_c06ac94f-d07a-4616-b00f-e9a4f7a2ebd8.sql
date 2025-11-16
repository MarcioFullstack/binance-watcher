-- Corrigir função para incluir search_path seguro
CREATE OR REPLACE FUNCTION public.activate_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar assinatura ativa de 30 dias para o novo usuário
  INSERT INTO public.subscriptions (user_id, status, expires_at)
  VALUES (
    NEW.id,
    'active',
    NOW() + INTERVAL '30 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';