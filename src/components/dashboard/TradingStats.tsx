import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBinanceData } from "@/hooks/useBinanceData";
import { TrendingUp, TrendingDown, Target, Percent } from "lucide-react";

export const TradingStats = () => {
  const { data: binanceData } = useBinanceData();

  if (!binanceData) return null;

  const positions = binanceData.positions || [];
  const totalPositions = positions.length;
  const longPositions = positions.filter(p => parseFloat(p.positionAmt) > 0).length;
  const shortPositions = positions.filter(p => parseFloat(p.positionAmt) < 0).length;
  
  const profitablePositions = positions.filter(p => parseFloat(p.unrealizedProfit) > 0);
  const losingPositions = positions.filter(p => parseFloat(p.unrealizedProfit) < 0);
  
  const winRate = totalPositions > 0 
    ? ((profitablePositions.length / totalPositions) * 100).toFixed(1)
    : "0.0";

  const bestTrade = positions.length > 0 ? positions.reduce((best, current) => {
    const profit = parseFloat(current.unrealizedProfit);
    return profit > parseFloat(best.unrealizedProfit) ? current : best;
  }, positions[0]) : null;

  const worstTrade = positions.length > 0 ? positions.reduce((worst, current) => {
    const profit = parseFloat(current.unrealizedProfit);
    return profit < parseFloat(worst.unrealizedProfit) ? current : worst;
  }, positions[0]) : null;

  const totalUnrealizedPnL = parseFloat(binanceData.pnl.unrealized);
  const avgPnLPerPosition = totalPositions > 0 
    ? (totalUnrealizedPnL / totalPositions).toFixed(2)
    : "0.00";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Win Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {profitablePositions.length} de {totalPositions} lucrativas
          </p>
        </CardContent>
      </Card>

      {/* Posições Long/Short */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Long vs Short</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{longPositions} / {shortPositions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Posições abertas
          </p>
        </CardContent>
      </Card>

      {/* Melhor Trade */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Melhor Trade</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            +${parseFloat(bestTrade?.unrealizedProfit || "0").toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {bestTrade?.symbol || "N/A"}
          </p>
        </CardContent>
      </Card>

      {/* Pior Trade */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pior Trade</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            ${parseFloat(worstTrade?.unrealizedProfit || "0").toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {worstTrade?.symbol || "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
