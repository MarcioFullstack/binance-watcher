import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import nottifyLogo from "@/assets/nottify-logo.png";

const SetupBinance = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accountData, setAccountData] = useState({
    name: "",
    apiKey: "",
    apiSecret: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Verificar se tem assinatura ativa
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!subscription || subscription.status !== "active") {
        toast.error("Você precisa de uma assinatura ativa");
        navigate("/payment");
        return;
      }

      // Verificar se já tem conta Binance configurada
      const { data: accounts } = await supabase
        .from("binance_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (accounts && accounts.length > 0) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/login");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountData.name || !accountData.apiKey || !accountData.apiSecret) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Adicionar conta Binance
      const { error } = await supabase.from("binance_accounts").insert([
        {
          user_id: user.id,
          account_name: accountData.name,
          api_key: accountData.apiKey,
          api_secret: accountData.apiSecret,
          is_active: true,
        },
      ]);

      if (error) throw error;

      toast.success("Conta Binance configurada com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao configurar conta");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-foreground">NOTTIFY</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure sua API Binance</CardTitle>
            <CardDescription>
              Conecte sua conta da Binance para começar a monitorar suas operações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta</Label>
                <Input
                  id="name"
                  placeholder="Minha Conta Principal"
                  value={accountData.name}
                  onChange={(e) =>
                    setAccountData({ ...accountData, name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="Sua API Key da Binance"
                  value={accountData.apiKey}
                  onChange={(e) =>
                    setAccountData({ ...accountData, apiKey: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="Seu API Secret da Binance"
                  value={accountData.apiSecret}
                  onChange={(e) =>
                    setAccountData({ ...accountData, apiSecret: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conectar Binance
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupBinance;
