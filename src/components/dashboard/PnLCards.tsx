import { Card } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { Loader2 } from "lucide-react";

export const PnLCards = () => {
  const { data: binanceData, isLoading } = useBinanceData();

  if (isLoading || !binanceData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unrealizedPnL = parseFloat(binanceData.pnl.unrealized);
  const todayPnL = parseFloat(binanceData.pnl.today);
  const todayPercent = parseFloat(binanceData.pnl.todayPercent);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Hoje (Realizado)</p>
          <p className={`text-2xl font-bold ${todayPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)} USDT
          </p>
          <p className={`text-xs ${todayPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
            {todayPercent >= 0 ? '+' : ''}{todayPercent.toFixed(2)}%
          </p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Total Realizado</p>
          <p className={`text-2xl font-bold ${parseFloat(binanceData.pnl.totalFromInitial) >= 0 ? 'text-success' : 'text-destructive'}`}>
            {parseFloat(binanceData.pnl.totalFromInitial) >= 0 ? '+' : ''}{binanceData.pnl.totalFromInitial} USDT
          </p>
          <p className={`text-xs ${parseFloat(binanceData.pnl.totalPercent) >= 0 ? 'text-success' : 'text-destructive'}`}>
            {parseFloat(binanceData.pnl.totalPercent) >= 0 ? '+' : ''}{binanceData.pnl.totalPercent}%
          </p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Posições Abertas</p>
          <p className="text-2xl font-bold text-primary">
            {binanceData.positions.length}
          </p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Saldo Usado</p>
          <p className="text-2xl font-bold text-foreground">
            {binanceData.balance.used} USDT
          </p>
        </Card>
      </div>

      <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">🤖 PnL NÃO REALIZADO (POSIÇÕES ABERTAS)</p>
            <p className={`text-3xl font-bold ${unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USDT
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">EM OPERAÇÃO</p>
            <p className="text-3xl font-bold text-primary">
              {binanceData.balance.used} USDT
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          📊 Lucro/Prejuízo atual das posições abertas pelo robô • Atualizado em tempo real
        </p>
      </Card>
    </div>
  );
};
