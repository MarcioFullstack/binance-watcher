import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useBinanceData } from "@/hooks/useBinanceData";

export const BalanceCards = () => {
  const { data: binanceData, isLoading } = useBinanceData();

  if (isLoading || !binanceData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalBalance = parseFloat(binanceData.balance.total);
  const availableBalance = parseFloat(binanceData.balance.available);
  const usedMargin = parseFloat(binanceData.balance.used);
  const unrealizedPnL = parseFloat(binanceData.pnl.unrealized);

  const isPnLPositive = unrealizedPnL >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Balance */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Saldo Total
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Carteira completa
          </p>
        </CardContent>
      </Card>

      {/* Available Balance */}
      <Card className="border-green-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Saldo Disponível
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            ${availableBalance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Livre para trading
          </p>
        </CardContent>
      </Card>

      {/* Used Margin */}
      <Card className="border-orange-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Margem Usada
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            ${usedMargin.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Em posições abertas
          </p>
        </CardContent>
      </Card>

      {/* Unrealized PnL */}
      <Card className={`border-${isPnLPositive ? 'green' : 'red'}-500/20`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            PnL Não Realizado
          </CardTitle>
          {isPnLPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPnLPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPnLPositive ? '+' : ''}${unrealizedPnL.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lucro/perda aberto
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
