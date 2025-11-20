import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
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
      <Card className="p-4 border-border">
        <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas de hoje</p>
        <div className="flex items-baseline gap-2">
          <h2 className={`text-3xl font-bold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
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
          <p className={`text-base font-semibold ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
            {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
          </p>
          <p className={`text-xs ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USD
          </p>
        </Card>

        <Card className="p-3 border-border">
          <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas de 30D</p>
          <p className={`text-base font-semibold ${yesterdayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {yesterdayPnL >= 0 ? '+' : ''}{yesterdayPnL.toFixed(2)}%
          </p>
          <p className={`text-xs ${yesterdayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {yesterdayPnL >= 0 ? '+' : ''}{yesterdayPnL.toFixed(2)} USD
          </p>
        </Card>

        <Card className="p-3 border-border">
          <p className="text-xs text-muted-foreground mb-1">Ganhos e Perdas desde sempre</p>
          <p className={`text-base font-semibold ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USD
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

      {/* Abas inferiores como na Binance */}
      <div className="flex gap-6 border-b border-border text-sm">
        <button className="pb-2 border-b-2 border-primary text-primary font-medium">
          Visão Geral
        </button>
        <button className="pb-2 text-muted-foreground hover:text-foreground">
          Detalhes
        </button>
        <button className="pb-2 text-muted-foreground hover:text-foreground">
          Análise do Símbolo
        </button>
        <button className="pb-2 text-muted-foreground hover:text-foreground">
          Finanças
        </button>
      </div>

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
    </div>
  );
};
