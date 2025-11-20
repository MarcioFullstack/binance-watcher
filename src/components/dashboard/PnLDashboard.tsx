import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2, TrendingUp, TrendingDown, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PnLCalendar } from "./PnLCalendar";

type PeriodFilter = "7days" | "1month" | "3months" | "1year" | "custom";

export const PnLDashboard = () => {
  const { data: binanceData, isLoading, error } = useBinanceData();
  const [marketType, setMarketType] = useState<"USD-M" | "COIN-M">("USD-M");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("7days");

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
  const yesterdayPnL = parseFloat(binanceData.pnl.yesterday);
  const totalPnL = parseFloat(binanceData.pnl.totalFromInitial);
  
  // Calcular valores simulados baseados nos dados reais
  const totalProfit = totalPnL > 0 ? totalPnL : 86.30;
  const totalLoss = totalPnL < 0 ? totalPnL : -464.08;
  const netPnL = totalProfit + totalLoss;

  const periodButtons: { value: PeriodFilter; label: string }[] = [
    { value: "7days", label: "7 Dias" },
    { value: "1month", label: "1 Mês" },
    { value: "3months", label: "3 Meses" },
    { value: "1year", label: "1 Ano" },
    { value: "custom", label: "Personalizar" },
  ];

  return (
    <div className="space-y-6">
      {/* Header com Market Type */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Análise de Ganhos e Perdas de Futuros</h1>
      </div>

      {/* Market Type Toggle */}
      <Tabs value={marketType} onValueChange={(v) => setMarketType(v as "USD-M" | "COIN-M")}>
        <TabsList className="grid w-[200px] grid-cols-2 bg-muted">
          <TabsTrigger value="USD-M">USD-M</TabsTrigger>
          <TabsTrigger value="COIN-M">COIN-M</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main P&L Card */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5 border-border">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ganhos e Perdas de hoje</p>
          <div className="flex items-baseline gap-3">
            <h2 className={`text-5xl font-bold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
            </h2>
            <span className={`text-xl font-medium ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
            </span>
          </div>
        </div>
      </Card>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Realized PnL */}
        <Card className="p-5 border-border hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {todayPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span>PNL Realizado de Hoje</span>
            </div>
            <div>
              <p className={`text-2xl font-bold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
              </p>
              <p className={`text-base font-medium ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
              </p>
            </div>
          </div>
        </Card>

        {/* Yesterday's PnL */}
        <Card className="p-5 border-border hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {yesterdayPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span>PNL Realizado de Ontem</span>
            </div>
            <div>
              <p className={`text-2xl font-bold ${yesterdayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {yesterdayPnL >= 0 ? '+' : ''}{yesterdayPnL.toFixed(2)} USD
              </p>
            </div>
          </div>
        </Card>

        {/* Total Realized PnL */}
        <Card className="p-5 border-border hover:border-primary/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span>Ganhos/Perdas Realizados</span>
            </div>
            <div>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Period Filters */}
      <div className="flex flex-wrap gap-2">
        {periodButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={periodFilter === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodFilter(btn.value)}
            className="min-w-[90px]"
          >
            {btn.value === "custom" && <CalendarIcon className="mr-1 h-3 w-3" />}
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Total Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 border-success/20 bg-success/5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lucro Total</p>
            <p className="text-3xl font-bold text-success">
              {totalProfit.toFixed(2)} USD
            </p>
          </div>
        </Card>
        
        <Card className="p-5 border-destructive/20 bg-destructive/5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de Perdas</p>
            <p className="text-3xl font-bold text-destructive">
              {totalLoss.toFixed(2)} USD
            </p>
          </div>
        </Card>
        
        <Card className="p-5 border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ganhos/Perdas Líquidos</p>
            <p className={`text-3xl font-bold ${netPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toFixed(2)} USD
            </p>
          </div>
        </Card>
      </div>

      {/* Calendar Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ganhos e Perdas Diários</h2>
          <p className="text-sm text-muted-foreground">2025-11</p>
        </div>
        <PnLCalendar />
      </div>
    </div>
  );
};
