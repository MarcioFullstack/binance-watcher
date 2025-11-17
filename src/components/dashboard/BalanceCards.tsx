import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const BalanceCards = () => {
  const { data, isLoading, error } = useBinanceData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading Binance data. Check if you have configured an active account.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure a Binance account to view your data.
        </AlertDescription>
      </Alert>
    );
  }

  const isProfit = parseFloat(data.pnl.today) >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6 border-border bg-card">
        <p className="text-sm text-muted-foreground mb-2">Saldo da Carteira</p>
        <p className="text-4xl font-bold text-foreground">{parseFloat(data.balance.total).toFixed(2)}</p>
      </Card>

      <Card className="p-6 border-2 border-secondary bg-card">
        <p className="text-sm text-secondary mb-2">Saldo Disponível</p>
        <p className="text-4xl font-bold text-secondary">{parseFloat(data.balance.available).toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-1">Livre para operar</p>
      </Card>

      <Card className="p-6 md:col-span-2 border-2 border-primary bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">PNL REALIZADO HOJE</p>
            <p className={`text-3xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
              {isProfit ? '+' : ''}${data.pnl.today}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">PERCENTUAL</p>
            <p className={`text-3xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
              {isProfit ? '+' : ''}{data.pnl.todayPercent}%
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          ⚡ Atualização em tempo real a cada 5 segundos
        </p>
      </Card>
    </div>
  );
};
