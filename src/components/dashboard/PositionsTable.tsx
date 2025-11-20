import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBinanceData } from "@/hooks/useBinanceData";
import { TrendingUp, TrendingDown } from "lucide-react";

export const PositionsTable = () => {
  const { data: binanceData } = useBinanceData();

  if (!binanceData || !binanceData.positions || binanceData.positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma posição aberta
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Símbolo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Preço Entrada</TableHead>
            <TableHead className="text-right">Preço Atual</TableHead>
            <TableHead className="text-right">PnL Não Realizado</TableHead>
            <TableHead className="text-right">Alavancagem</TableHead>
            <TableHead className="text-center">Direção</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {binanceData.positions.map((position, index) => {
            const amount = parseFloat(position.positionAmt);
            const isLong = amount > 0;
            const unrealizedProfit = parseFloat(position.unrealizedProfit);
            const isProfitable = unrealizedProfit >= 0;
            const leverage = position.leverage;

            return (
              <TableRow key={`${position.symbol}-${index}`}>
                <TableCell className="font-medium">{position.symbol}</TableCell>
                <TableCell className="text-right">
                  {Math.abs(amount).toFixed(1)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-muted-foreground">-</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-muted-foreground">-</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className={`flex items-center justify-end gap-1 font-semibold ${
                    isProfitable ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {isProfitable ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isProfitable ? '+' : ''}${unrealizedProfit.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {leverage}x
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={isLong ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isLong ? 'LONG' : 'SHORT'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
