import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { useDailyPnL } from "@/hooks/useDailyPnL";
import { Loader2, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PnLCalendar } from "./PnLCalendar";
import { PositionsTable } from "./PositionsTable";
import { TradingStats } from "./TradingStats";

type PeriodFilter = "7days" | "1month" | "3months" | "1year" | "custom";

export const PnLDashboard = () => {
  const { data: binanceData, isLoading, error, isFetching } = useBinanceData();
  const { data: dailyPnLData } = useDailyPnL();
  const [marketType, setMarketType] = useState<"USD-M" | "COIN-M">("USD-M");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("7days");
  const [activeTab, setActiveTab] = useState("overview");

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
  const totalPnL = parseFloat(binanceData.pnl.totalFromInitial);
  
  // Usar dados de daily_pnl para períodos históricos
  const pnl7Days = dailyPnLData?.last7Days.pnl || 0;
  const pnl7DaysPercent = dailyPnLData?.last7Days.percent || 0;
  const pnl30Days = dailyPnLData?.last30Days.pnl || 0;
  const pnl30DaysPercent = dailyPnLData?.last30Days.percent || 0;
  const pnlAllTime = dailyPnLData?.allTime.pnl || totalPnL;
  const pnlAllTimePercent = dailyPnLData?.allTime.percent || parseFloat(binanceData.pnl.totalPercent);
  
  // Calcular valores para resumo
  const totalProfit = pnlAllTime > 0 ? pnlAllTime : 0;
  const totalLoss = pnlAllTime < 0 ? pnlAllTime : 0;
  const netPnL = pnlAllTime;

  const periodButtons: { value: PeriodFilter; label: string }[] = [
    { value: "7days", label: "7 Dias" },
    { value: "1month", label: "1 Mês" },
    { value: "3months", label: "3 Meses" },
    { value: "1year", label: "1 Ano" },
    { value: "custom", label: "Personalizar" },
  ];

  return (
    <div className="space-y-4">
      {/* Header com Market Type */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Análise de Ganhos e Perdas de Futuros</h1>
      </div>

      {/* Market Type Toggle */}
      <Tabs value={marketType} onValueChange={(v) => setMarketType(v as "USD-M" | "COIN-M")}>
        <TabsList className="grid w-[180px] grid-cols-2">
          <TabsTrigger value="USD-M">USD-M</TabsTrigger>
          <TabsTrigger value="COIN-M">COIN-M</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main P&L Card - Ganhos e Perdas de hoje */}
      <Card className="p-4 border-border hover:border-glow transition-all">
        <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas de hoje</p>
        <div className="flex items-baseline gap-2">
          <h2 className={`text-3xl font-bold ${todayPercent >= 0 ? 'text-success text-glow' : 'text-destructive'}`}>
            {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
          </h2>
          <span className={`text-base font-medium ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
          </span>
        </div>
      </Card>

      {/* Cards de 7D / 30D / desde sempre */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3 border-border">
          <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas de 7D</p>
          <p className={`text-base font-semibold ${pnl7Days >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnl7Days >= 0 ? '+' : ''}{pnl7DaysPercent.toFixed(2)}%
          </p>
          <p className={`text-xs ${pnl7Days >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnl7Days >= 0 ? '+' : ''}{pnl7Days.toFixed(2)} USD
          </p>
        </Card>

        <Card className="p-3 border-border">
          <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas de 30D</p>
          <p className={`text-base font-semibold ${pnl30Days >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnl30Days >= 0 ? '+' : ''}{pnl30DaysPercent.toFixed(2)}%
          </p>
          <p className={`text-xs ${pnl30Days >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnl30Days >= 0 ? '+' : ''}{pnl30Days.toFixed(2)} USD
          </p>
        </Card>

        <Card className="p-3 border-border">
          <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas desde sempre</p>
          <p className={`text-base font-semibold ${pnlAllTime >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnlAllTime >= 0 ? '+' : ''}{pnlAllTimePercent.toFixed(2)}%
          </p>
          <p className={`text-xs ${pnlAllTime >= 0 ? 'text-success' : 'text-destructive'}`}>
            {pnlAllTime >= 0 ? '+' : ''}{pnlAllTime.toFixed(2)} USD
          </p>
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
            className="text-xs"
          >
            {btn.value === "custom" && <CalendarIcon className="mr-1 h-3 w-3" />}
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Lista de resumo de lucros e perdas */}
      <Card className="p-4 border-border">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Lucro Total</span>
            <span className="font-medium text-foreground">
              {totalProfit.toFixed(2)} USD
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total de Perdas</span>
            <span className="font-medium text-foreground">
              {totalLoss.toFixed(2)} USD
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ganhos/Perdas Líquidos</span>
            <span className={`font-semibold ${netPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netPnL >= 0 ? '+' : ''}{netPnL.toFixed(2)} USD
            </span>
          </div>
        </div>
      </Card>

      {/* Abas inferiores */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="positions">Posições</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Seção de calendário de PnL diário */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Ganhos e Perdas Diários</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>2025-11</span>
              </div>
            </div>
            <PnLCalendar />
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Posições Abertas</h2>
            <PositionsTable />
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h2 className="text-sm font-medium">Estatísticas de Trading</h2>
            <TradingStats />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Calendário de PnL</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>2025-11</span>
              </div>
            </div>
            <PnLCalendar />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
