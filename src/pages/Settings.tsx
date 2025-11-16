import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { activateVoucher } from "@/hooks/useBinanceData";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newAccount, setNewAccount] = useState({
    name: "",
    apiKey: "",
    apiSecret: "",
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAccounts();
    loadSubscription();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("binance_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.apiKey || !newAccount.apiSecret) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Desativar todas as outras contas
      await supabase
        .from("binance_accounts")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Adicionar nova conta como ativa
      const { error } = await supabase.from("binance_accounts").insert([
        {
          user_id: user.id,
          account_name: newAccount.name,
          api_key: newAccount.apiKey,
          api_secret: newAccount.apiSecret,
          is_active: true,
        },
      ]);

      if (error) throw error;

      toast.success("Conta adicionada com sucesso!");
      setNewAccount({ name: "", apiKey: "", apiSecret: "" });
      loadAccounts();
    } catch (error: any) {
      toast.error("Erro ao adicionar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase.from("binance_accounts").delete().eq("id", id);

      if (error) throw error;

      toast.success("Conta removida com sucesso!");
      loadAccounts();
    } catch (error: any) {
      toast.error("Erro ao remover conta");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Desativar todas
      await supabase
        .from("binance_accounts")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Ativar selecionada
      const { error } = await supabase
        .from("binance_accounts")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Conta ativada!");
      loadAccounts();
    } catch (error: any) {
      toast.error("Erro ao ativar conta");
    }
  };

  const handleActivateVoucher = async () => {
    if (!voucherCode) {
      toast.error("Digite o código do voucher");
      return;
    }

    setLoading(true);
    try {
      const result = await activateVoucher(voucherCode);
      toast.success(result.message);
      setVoucherCode("");
      loadSubscription();
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Assinatura</CardTitle>
            <CardDescription>Ative seu voucher para começar a usar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && subscription.status === 'active' ? (
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="default" className="mb-2">Ativa</Badge>
                  <p className="text-sm text-muted-foreground">
                    Expira em: {new Date(subscription.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="secondary">Inativa</Badge>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código do voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  <Button onClick={handleActivateVoucher} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use o voucher: <code className="bg-muted px-2 py-1 rounded">NOTT-IFY2-025B-OT01</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Binance Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Contas Binance</CardTitle>
            <CardDescription>Gerencie suas chaves de API da Binance Futures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{account.account_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.api_key.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.is_active ? (
                      <Badge variant="default">Ativa</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(account.id)}
                      >
                        Ativar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Nova Conta
              </h4>
              <div className="space-y-2">
                <Label>Nome da Conta</Label>
                <Input
                  placeholder="Ex: Conta Principal"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  placeholder="Sua API Key da Binance"
                  value={newAccount.apiKey}
                  onChange={(e) => setNewAccount({ ...newAccount, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input
                  type="password"
                  placeholder="Seu API Secret da Binance"
                  value={newAccount.apiSecret}
                  onChange={(e) => setNewAccount({ ...newAccount, apiSecret: e.target.value })}
                />
              </div>
              <Button onClick={handleAddAccount} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  "Adicionar Conta"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
