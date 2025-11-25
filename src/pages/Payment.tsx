import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";
import { activateVoucher } from "@/utils/voucher";
import nottifyLogo from "@/assets/nottify-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OnboardingProgress } from "@/components/OnboardingProgress";

const Payment = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const navigate = useNavigate();
  const walletAddress = "0xf9ef22c89bd224f911eaf61c43a39460540eac4f";

  const plans = {
    monthly: { price: 10, duration: '1 mês', savings: '' },
    quarterly: { price: 25, duration: '3 meses', savings: 'Economize $5' },
    yearly: { price: 90, duration: '12 meses', savings: 'Economize $30' }
  };

  useEffect(() => {
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if has active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subscription?.status === "active") {
        navigate("/setup-binance");
        return;
      }

      // Check if has pending payment
      const { data: payment } = await supabase
        .from("pending_payments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      setPendingPayment(payment);
    } catch (error) {
      console.error("Error checking payment:", error);
    } finally {
      setChecking(false);
    }
  };

  const createPendingPayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("payment.errors.notAuthenticated"));

      const { error } = await supabase
        .from("pending_payments")
        .insert({
          user_id: user.id,
          wallet_address: walletAddress,
          expected_amount: plans[selectedPlan].price,
          currency: "USD",
          status: "pending",
          plan_type: selectedPlan,
        });

      if (error) throw error;

      toast.success(t("payment.success.paymentRegistered"));
      await checkPaymentStatus();
    } catch (error: any) {
      toast.error(error.message || t("payment.errors.registerPaymentError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success(t("payment.addressCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const generateTestVoucher = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a unique voucher code
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `TEST-${timestamp}-${random}`;

      // Call edge function to create voucher
      const { data, error: funcError } = await supabase.functions.invoke('create-voucher', {
        body: { code: generatedCode, days: 15 }
      });
      
      if (funcError) throw funcError;

      setVoucherCode(generatedCode);
      toast.success(`Voucher gerado: ${generatedCode} (15 dias)`);
    } catch (error: any) {
      console.error("Error generating voucher:", error);
      toast.error("Erro ao gerar voucher. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateVoucher = async () => {
    const trimmedCode = voucherCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      toast.error("Por favor, insira um código de voucher");
      return;
    }

    // Validação básica: 5-30 caracteres, alfanuméricos e hífens
    if (trimmedCode.length < 5 || trimmedCode.length > 30) {
      toast.error("Código deve ter entre 5 e 30 caracteres");
      return;
    }

    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      toast.error("Código deve conter apenas letras, números e hífens");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-voucher', {
        body: { code: trimmedCode }
      });

      if (error) {
        console.error('Voucher activation error:', error);
        toast.error("Erro ao comunicar com servidor. Tente novamente.");
        return;
      }

      // Verificar error_code retornado
      if (data?.error_code) {
        console.error('Voucher error code:', data.error_code, data);
        
        switch (data.error_code) {
          case 'VOUCHER_NOT_FOUND':
            toast.error(`❌ Voucher "${trimmedCode}" não foi encontrado no sistema. Verifique se o código está correto ou contacte o administrador.`);
            break;
          case 'VOUCHER_ALREADY_USED':
            toast.error("Este voucher já foi utilizado e não pode ser reutilizado.");
            break;
          case 'VOUCHER_ALREADY_ACTIVATED_BY_USER':
            toast.error("Você já ativou este voucher anteriormente.");
            break;
          case 'VOUCHER_MAX_USES_REACHED':
            toast.error("Este voucher atingiu o limite máximo de utilizações.");
            break;
          case 'INVALID_CODE_LENGTH':
            toast.error("Código de voucher tem tamanho inválido.");
            break;
          case 'INVALID_CHARACTERS':
            toast.error("Código de voucher contém caracteres inválidos.");
            break;
          case 'NOT_AUTHENTICATED':
          case 'INVALID_SESSION':
            toast.error("Sessão expirada. Por favor, faça login novamente.");
            setTimeout(() => navigate("/login"), 2000);
            break;
          default:
            toast.error(data.error || "Falha ao ativar voucher. Tente novamente.");
        }
        return;
      }

      // Sucesso
      if (data?.success) {
        toast.success(`✅ Voucher ativado com sucesso! ${data.days} dias adicionados à sua assinatura.`);
        setVoucherCode("");
        
        // Aguardar um pouco mais para garantir que o banco de dados propagou a atualização
        setTimeout(() => {
          navigate("/setup-binance", { state: { fromVoucherActivation: true } });
        }, 2500);
      }
    } catch (error: any) {
      console.error('Unexpected voucher activation error:', error);
      toast.error("Erro inesperado ao ativar voucher. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl space-y-6">
        <OnboardingProgress currentStep={2} />
        
        <div className="flex items-center justify-center gap-3">
          <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-foreground">NOTTIFY</h1>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("payment.activateSubscription")}</CardTitle>
            <CardDescription>
              {t("payment.choosePaymentMethod")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="crypto" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crypto">{t("payment.cryptoPayment")}</TabsTrigger>
                <TabsTrigger value="voucher">{t("payment.voucherPayment")}</TabsTrigger>
              </TabsList>

              <TabsContent value="crypto" className="space-y-4">
                {checking ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Plan Selection */}
                    <div className="space-y-2">
                      <Label>{t("payment.selectPlan") || "Selecione seu plano"}</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(plans).map(([key, plan]) => (
                          <button
                            key={key}
                            onClick={() => setSelectedPlan(key as 'monthly' | 'quarterly' | 'yearly')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedPlan === key
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            disabled={!!pendingPayment}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-foreground">${plan.price}</p>
                                <p className="text-sm text-muted-foreground">{plan.duration}</p>
                              </div>
                              {plan.savings && (
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                  {plan.savings}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-primary/5 rounded-lg text-center">
                      <p className="text-4xl font-bold text-primary mb-2">
                        ${plans[selectedPlan].price}
                      </p>
                      <p className="text-sm text-muted-foreground">{plans[selectedPlan].duration}</p>
                    </div>


                    {pendingPayment ? (
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <AlertDescription className="text-blue-600 dark:text-blue-400">
                          ⏳ {t("payment.pendingPayment")}
                          <br />
                          <span className="text-xs">
                            {t("payment.createdAt")} {new Date(pendingPayment.created_at).toLocaleString()}
                            <br />
                            Plano: {pendingPayment.plan_type === 'yearly' ? 'Anual' : pendingPayment.plan_type === 'quarterly' ? 'Trimestral' : 'Mensal'}
                          </span>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="space-y-2">
                      <Label>{t("payment.walletAddress")}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={walletAddress}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyWallet}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("payment.sendPayment")}
                      </p>
                    </div>

                    {!pendingPayment && (
                      <Button
                        onClick={createPendingPayment}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("payment.registerPayment")}
                      </Button>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {pendingPayment 
                          ? t("payment.paymentWillBeVerified")
                          : t("payment.clickAfterSending")}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="voucher" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucher">Código do Voucher</Label>
                      <Input
                        id="voucher"
                        placeholder="PZZF-MRTH-EIPV-SGRA"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        maxLength={30}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Digite o código do voucher que você recebeu
                      </p>
                    </div>

                    <Button
                      onClick={handleActivateVoucher}
                      disabled={loading || !voucherCode.trim()}
                      className="w-full"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Ativar Voucher
                    </Button>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        💡 Já tem um voucher? Ative aqui e tenha acesso instantâneo.
                      </p>
                    </div>
                  </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;
