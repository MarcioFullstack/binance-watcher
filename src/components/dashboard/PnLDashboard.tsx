import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { PnLCalendar } from "./PnLCalendar";

export const PnLDashboard = () => {
  const { data: binanceData, isLoading, error } = useBinanceData();
  const [marketType, setMarketType] = useState<"USD-M" | "COIN-M">("USD-M");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !binanceData) {
    return null;
  }

  const todayPnL = parseFloat(binanceData.pnl.today);
  const todayPercent = parseFloat(binanceData.pnl.todayPercent);
  const unrealizedPnL = parseFloat(binanceData.pnl.unrealized);
  const totalPnL = parseFloat(binanceData.pnl.totalFromInitial);
  const totalPercent = parseFloat(binanceData.pnl.totalPercent);

  // Calcular lucro total e perda total (simulado - você pode adicionar esses dados na API)
  const totalProfit = totalPnL > 0 ? totalPnL : 0;
  const totalLoss = totalPnL < 0 ? totalPnL : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Análise de Ganhos e Perdas de Futuros</h1>
      </div>

      {/* Market Type Toggle */}
      <Tabs value={marketType} onValueChange={(v) => setMarketType(v as "USD-M" | "COIN-M")}>
        <TabsList className="grid w-[200px] grid-cols-2">
          <TabsTrigger value="USD-M">USD-M</TabsTrigger>
          <TabsTrigger value="COIN-M">COIN-M</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Daily P&L Card */}
      <Card className="p-6 bg-gradient-to-br from-card to-primary/5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ganhos e Perdas de hoje</p>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-4xl font-bold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
            </h2>
            <span className={`text-lg ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
            </span>
          </div>
        </div>
      </Card>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Realized PnL */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {todayPnL >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span>PNL Realizado de Hoje</span>
            </div>
            <div>
              <p className={`text-xl font-bold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
              </p>
              <p className={`text-sm ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
              </p>
            </div>
          </div>
        </Card>

        {/* Unrealized PnL (as Yesterday's proxy) */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {unrealizedPnL >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span>PNL Não Realizado</span>
            </div>
            <div>
              <p className={`text-xl font-bold ${unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USD
              </p>
              <p className="text-xs text-muted-foreground">Posições Abertas</p>
            </div>
          </div>
        </Card>

        {/* Total Realized PnL */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span>Ganhos/Perdas Realizados</span>
            </div>
            <div>
              <p className={`text-xl font-bold ${totalPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPercent >= 0 ? '+' : ''}{totalPercent.toFixed(2)}%
              </p>
              <p className={`text-sm ${totalPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Total Summary */}
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Lucro Total</p>
            <p className="text-2xl font-bold text-success">
              {totalProfit.toFixed(2)} USD
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total de Perdas</p>
            <p className="text-2xl font-bold text-destructive">
              {totalLoss.toFixed(2)} USD
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ganhos/Perdas Líquidos</p>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
            </p>
          </div>
        </div>
      </Card>

      {/* Calendar View */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ganhos e Perdas Diários</h2>
        <PnLCalendar />
      </div>
    </div>
  );
};
