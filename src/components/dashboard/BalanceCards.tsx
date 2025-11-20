import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2, DollarSign, TrendingUp, Wallet, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { RiskManagement } from "./RiskManagement";

export const BalanceCards = () => {
  const { data, isLoading, error } = useBinanceData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't show error here if it's a keys validation error - it will be shown in the main alert
  const isKeysError = error instanceof Error && error.message === 'BINANCE_KEYS_INVALID';

  if (error && !isKeysError) {
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
    return null;
  }

  const isProfit = parseFloat(data.pnl.today) >= 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${parseFloat(data.balance.total).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atualização em tempo real
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Disponível
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${parseFloat(data.balance.available).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Livre para operar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usado em Posições
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              ${parseFloat(data.balance.used).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem ocupada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              PNL de Hoje
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
              ${parseFloat(data.pnl.today).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-sm font-medium ${parseFloat(data.pnl.todayPercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {parseFloat(data.pnl.todayPercent) >= 0 ? '+' : ''}{parseFloat(data.pnl.todayPercent).toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">
                vs banca inicial
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <RiskManagement data={data} />
    </>
  );
};
