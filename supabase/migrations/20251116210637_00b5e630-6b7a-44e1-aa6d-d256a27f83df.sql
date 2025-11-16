-- Criar função para ativar assinatura automaticamente para novos usuários
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa após inserção em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_trial_subscription();