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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activateVoucher } from "@/utils/voucher";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { AdvancedLossAlertSettings } from "@/components/settings/AdvancedLossAlertSettings";


const Settings = () => {
  const { t } = useTranslation();
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
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };


  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.apiKey || !newAccount.apiSecret) {
      toast.error("Fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save account using secure backend function (handles encryption)
      const { data, error } = await supabase.functions.invoke("save-binance-account", {
        body: {
          account_name: newAccount.name,
          api_key: newAccount.apiKey,
          api_secret: newAccount.apiSecret,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      if (error) throw error;

      toast.success("Account added successfully!");
      setNewAccount({ name: "", apiKey: "", apiSecret: "" });
      loadAccounts();
    } catch (error: any) {
      toast.error("Error adding account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase.from("binance_accounts").delete().eq("id", id);

      if (error) throw error;

      toast.success("Account removed successfully!");
      loadAccounts();
    } catch (error: any) {
      toast.error("Error removing account");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deactivate all
      await supabase
        .from("binance_accounts")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Activate selected
      const { error } = await supabase
        .from("binance_accounts")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Account activated!");
      loadAccounts();
    } catch (error: any) {
      toast.error("Error activating account");
    }
  };

  const handleActivateVoucher = async () => {
    const trimmedCode = voucherCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      toast.error("Digite o código do voucher");
      return;
    }

    // Validação: aceita códigos alfanuméricos com hífens entre 5 e 30 caracteres
    if (trimmedCode.length < 5 || trimmedCode.length > 30) {
      toast.error("Código inválido. Deve ter entre 5 e 30 caracteres");
      return;
    }

    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      toast.error("Código inválido. Use apenas letras, números e hífens");
      return;
    }

    setLoading(true);
    try {
      const result = await activateVoucher(trimmedCode);
      
      if (result.error_code) {
        // Traduzir códigos de erro
        const errorMessages: Record<string, string> = {
          'VOUCHER_NOT_FOUND': 'Voucher não encontrado',
          'VOUCHER_ALREADY_USED': 'Este voucher já foi utilizado',
          'VOUCHER_ALREADY_ACTIVATED_BY_USER': 'Você já ativou este voucher',
          'VOUCHER_MAX_USES_REACHED': 'Voucher atingiu o limite de usos',
          'CODE_REQUIRED': 'Código do voucher é obrigatório',
          'INVALID_CODE_LENGTH': 'Tamanho do código inválido',
          'INVALID_CHARACTERS': 'Código contém caracteres inválidos',
          'NOT_AUTHENTICATED': 'Você precisa estar autenticado',
          'INVALID_SESSION': 'Sessão inválida. Faça login novamente',
        };
        
        const errorMsg = errorMessages[result.error_code] || 'Erro ao ativar voucher';
        toast.error(errorMsg);
        return;
      }

      const daysGranted = result.days_granted ?? result.days;
      const expiresAt = result.expires_at ?? result.expiresAt;

      toast.success(`✅ Voucher ativado! ${daysGranted} dias adicionados à sua assinatura.`, {
        description: expiresAt
          ? `Nova data de expiração: ${new Date(expiresAt).toLocaleDateString('pt-BR')}`
          : undefined,
        duration: 5000,
      });
      
      setVoucherCode("");
      loadSubscription();
    } catch (error: any) {
      console.error('Error activating voucher:', error);
      toast.error(error.message || "Erro ao ativar voucher. Tente novamente.");
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
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Activate your voucher to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && subscription.status === 'active' ? (
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="default" className="mb-2">Active</Badge>
                  <p className="text-sm text-muted-foreground">
                    Expires on: {new Date(subscription.expires_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Badge variant="secondary">Inactive</Badge>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    maxLength={30}
                  />
                  <Button onClick={handleActivateVoucher} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use o voucher: <code className="bg-muted px-2 py-1 rounded">NOTT-IFY2-025B-OT01</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>Select interface language</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>

        {/* Advanced Loss Alarm Settings */}
        <AdvancedLossAlertSettings />

        {/* Binance Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Binance Accounts</CardTitle>
            <CardDescription>Manage your Binance Futures API keys</CardDescription>
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
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(account.id)}
                      >
                        Activate
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
                Add New Account
              </h4>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  placeholder="Ex: Main Account"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  placeholder="Your Binance API Key"
                  value={newAccount.apiKey}
                  onChange={(e) => setNewAccount({ ...newAccount, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>API Secret</Label>
                <Input
                  type="password"
                  placeholder="Your Binance API Secret"
                  value={newAccount.apiSecret}
                  onChange={(e) => setNewAccount({ ...newAccount, apiSecret: e.target.value })}
                />
              </div>
              <Button onClick={handleAddAccount} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Account"
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
