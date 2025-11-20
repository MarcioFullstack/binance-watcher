import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2 } from "lucide-react";

export const BalanceCards = () => {
  const { data: binanceData, isLoading } = useBinanceData();

  if (isLoading || !binanceData) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card rounded-lg border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
          </div>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
      {/* Total Balance */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Saldo Total</span>
        <span className="text-lg font-semibold">${totalBalance.toFixed(2)}</span>
      </div>

      {/* Available Balance */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Disponível</span>
        <span className="text-lg font-semibold">${availableBalance.toFixed(2)}</span>
      </div>

      {/* Used Margin */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Margem Usada</span>
        <span className="text-lg font-semibold">${usedMargin.toFixed(2)}</span>
      </div>

      {/* Unrealized PnL */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">PnL Não Realizado</span>
        <span className={`text-lg font-semibold ${isPnLPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPnLPositive ? '+' : ''}${unrealizedPnL.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
