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
import { activateVoucher } from "@/hooks/useBinanceData";
import nottifyLogo from "@/assets/nottify-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Payment = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const navigate = useNavigate();
  const walletAddress = "0xf9ef22c89bd224f911eaf61c43a39460540eac4f";

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
          expected_amount: 15.00,
          currency: "USD",
          status: "pending",
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

  const handleActivateVoucher = async () => {
    const trimmedCode = voucherCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      toast.error(t("payment.errors.enterCode"));
      return;
    }

    // Validação do formato: XXXX-XXXX-XXXX-XXXX
    const voucherRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!voucherRegex.test(trimmedCode)) {
      toast.error(t("payment.errors.invalidFormat"));
      return;
    }

    setLoading(true);
    try {
      const result = await activateVoucher(trimmedCode);
      if (result.success) {
        toast.success(t("payment.success.voucherActivated", { days: result.days }));
        navigate("/setup-binance");
      }
    } catch (error: any) {
      const errorCode = error.error_code || "defaultError";
      const errorKey = `payment.errors.${errorCode}`;
      toast.error(t(errorKey));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <img src={nottifyLogo} alt="NOTTIFY" className="w-12 h-12" />
          <h1 className="text-3xl font-bold text-foreground">NOTTIFY</h1>
        </div>

        <Card>
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
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-primary/5 rounded-lg">
                      <p className="text-4xl font-bold text-primary mb-2">$15.00</p>
                      <p className="text-sm text-muted-foreground">{t("payment.oneTimePayment")}</p>
                    </div>

                    {pendingPayment ? (
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <AlertDescription className="text-blue-600 dark:text-blue-400">
                          ⏳ {t("payment.pendingPayment")}
                          <br />
                          <span className="text-xs">{t("payment.createdAt")} {new Date(pendingPayment.created_at).toLocaleString()}</span>
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
                    <Label htmlFor="voucher">{t("payment.voucherCode")}</Label>
                    <Input
                      id="voucher"
                      placeholder={t("payment.voucherPlaceholder")}
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      maxLength={19}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    onClick={handleActivateVoucher}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("payment.activate")}
                  </Button>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      💡 {t("payment.haveVoucher")}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
