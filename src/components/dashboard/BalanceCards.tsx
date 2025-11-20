import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export const BalanceCards = () => {
  const { data: binanceData, isLoading, isFetching, dataUpdatedAt } = useBinanceData();
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    if (dataUpdatedAt) {
      const now = new Date();
      const updated = new Date(dataUpdatedAt);
      const diffSeconds = Math.floor((now.getTime() - updated.getTime()) / 1000);
      
      if (diffSeconds < 60) {
        setLastUpdate(`há ${diffSeconds}s`);
      } else {
        setLastUpdate(`há ${Math.floor(diffSeconds / 60)}m`);
      }
    }
  }, [dataUpdatedAt, isFetching]);

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card rounded-lg border relative">
      {/* Sync Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching && !isLoading ? (
          <>
            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
            <span className="text-primary font-medium">Sincronizando...</span>
          </>
        ) : (
          lastUpdate && (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Atualizado {lastUpdate}</span>
            </>
          )
        )}
      </div>

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
