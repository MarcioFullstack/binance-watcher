import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";
import { activateVoucher } from "@/hooks/useBinanceData";
import nottifyLogo from "@/assets/nottify-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Payment = () => {
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const walletAddress = "0xf9ef22c89bd224f911eaf61c43a39460540eac4f";

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Endereço copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivateVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Digite o código do voucher");
      return;
    }

    setLoading(true);
    try {
      const result = await activateVoucher(voucherCode);
      toast.success(result.message);
      navigate("/setup-binance");
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar voucher");
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
            <CardTitle>Ativar Assinatura</CardTitle>
            <CardDescription>
              Escolha entre pagamento em criptomoedas ou use um voucher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="crypto" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crypto">Criptomoedas</TabsTrigger>
                <TabsTrigger value="voucher">Voucher</TabsTrigger>
              </TabsList>

              <TabsContent value="crypto" className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="p-6 bg-primary/5 rounded-lg">
                    <p className="text-4xl font-bold text-primary mb-2">$15.00</p>
                    <p className="text-sm text-muted-foreground">Pagamento único em USD ou criptomoedas</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço da Carteira</Label>
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
                      Envie $15 em USD ou equivalente em criptomoedas para este endereço
                    </p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Após realizar o pagamento, entre em contato com o suporte para ativar sua assinatura.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="voucher" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="voucher">Código do Voucher</Label>
                    <Input
                      id="voucher"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    onClick={handleActivateVoucher}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ativar Voucher
                  </Button>
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
