import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, AlertTriangle, Volume2 } from "lucide-react";
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
  const [maxLossPercent, setMaxLossPercent] = useState<string>("10");
  const [savingLossLimit, setSavingLossLimit] = useState(false);
  const [sirenType, setSirenType] = useState<string>("police");
  const navigate = useNavigate();

  useEffect(() => {
    loadAccounts();
    loadSubscription();
    loadLossLimit();
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

  const loadLossLimit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("risk_settings")
        .select("risk_percent, siren_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.risk_percent) {
        setMaxLossPercent(data.risk_percent.toString());
      }
      if (data?.siren_type) {
        setSirenType(data.siren_type);
      }
    } catch (error) {
      console.error("Error loading loss limit:", error);
    }
  };

  const handleSaveLossLimit = async () => {
    const lossValue = parseFloat(maxLossPercent);
    
    if (isNaN(lossValue) || lossValue <= 0 || lossValue > 100) {
      toast.error("Digite uma porcentagem válida entre 0.1 e 100");
      return;
    }

    setSavingLossLimit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("risk_settings")
        .upsert({
          user_id: user.id,
          risk_percent: lossValue,
          siren_type: sirenType,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving loss limit:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingLossLimit(false);
    }
  };

  const testSiren = (type: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different siren patterns
    switch(type) {
      case 'police': // Classic police siren
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.5);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 1);
        break;
      case 'ambulance': // Ambulance siren
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.3);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.6);
        break;
      case 'fire': // Fire truck siren
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.4);
        oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.8);
        break;
      case 'alarm': // Building alarm
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.2);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.4);
        break;
      case 'alert': // Sharp alert
        oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.3);
        break;
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
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
      toast.error("Enter the voucher code");
      return;
    }

    // Validation of format: XXXX-XXXX-XXXX-XXXX
    const voucherRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!voucherRegex.test(trimmedCode)) {
      toast.error("Invalid format. Use: XXXX-XXXX-XXXX-XXXX");
      return;
    }

    setLoading(true);
    try {
      const result = await activateVoucher(trimmedCode);
      toast.success(result.message);
      setVoucherCode("");
      loadSubscription();
    } catch (error: any) {
      toast.error(error.message || "Error activating voucher");
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
                    maxLength={19}
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

        {/* Quick Loss Limit Setting */}
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>Configurações de Risco</CardTitle>
            </div>
            <CardDescription>
              Configure sua margem de perda e o tipo de alerta sonoro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loss Percentage */}
            <div className="space-y-2">
              <Label htmlFor="maxLoss" className="text-base font-medium">
                Porcentagem Máxima de Perda (%)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="maxLoss"
                  type="number"
                  value={maxLossPercent}
                  onChange={(e) => setMaxLossPercent(e.target.value)}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="text-lg font-semibold"
                  placeholder="Ex: 10"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Esta é sua margem de risco global. Configure alertas personalizados abaixo para diferentes níveis.
              </p>
            </div>

            {/* Siren Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="sirenType" className="text-base font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Tipo de Sirene
              </Label>
              <div className="flex gap-2">
                <Select value={sirenType} onValueChange={setSirenType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o tipo de sirene" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="police">🚓 Sirene de Polícia</SelectItem>
                    <SelectItem value="ambulance">🚑 Sirene de Ambulância</SelectItem>
                    <SelectItem value="fire">🚒 Sirene de Bombeiros</SelectItem>
                    <SelectItem value="alarm">🔔 Alarme de Prédio</SelectItem>
                    <SelectItem value="alert">⚠️ Alerta Agudo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => testSiren(sirenType)}
                  title="Testar som"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Escolha o som que será reproduzido quando um alerta for disparado.
              </p>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveLossLimit} 
              disabled={savingLossLimit}
              size="lg"
              className="w-full"
            >
              {savingLossLimit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar Configurações"
              )}
            </Button>
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
