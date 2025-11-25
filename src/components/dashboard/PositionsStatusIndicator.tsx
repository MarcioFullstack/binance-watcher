import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CircleOff, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PositionsStatusIndicatorProps {
  hasOpenPositions: boolean;
  positionsCount: number;
  totalUnrealizedPnL?: number;
}

export const PositionsStatusIndicator = ({
  hasOpenPositions,
  positionsCount,
  totalUnrealizedPnL = 0,
}: PositionsStatusIndicatorProps) => {
  const isProfitable = totalUnrealizedPnL > 0;
  const isLoss = totalUnrealizedPnL < 0;

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      hasOpenPositions 
        ? isProfitable 
          ? "border-green-500/50 bg-green-500/5"
          : isLoss
          ? "border-orange-500/50 bg-orange-500/5"
          : "border-blue-500/50 bg-blue-500/5"
        : "border-muted bg-muted/20"
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasOpenPositions ? (
              <div className={cn(
                "p-3 rounded-full",
                isProfitable 
                  ? "bg-green-500/20" 
                  : isLoss 
                  ? "bg-orange-500/20"
                  : "bg-blue-500/20"
              )}>
                <Activity className={cn(
                  "h-6 w-6",
                  isProfitable 
                    ? "text-green-500" 
                    : isLoss 
                    ? "text-orange-500"
                    : "text-blue-500"
                )} />
              </div>
            ) : (
              <div className="p-3 rounded-full bg-muted">
                <CircleOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div>
              <h3 className={cn(
                "font-semibold text-lg",
                hasOpenPositions 
                  ? isProfitable 
                    ? "text-green-500" 
                    : isLoss 
                    ? "text-orange-500"
                    : "text-blue-500"
                  : "text-muted-foreground"
              )}>
                {hasOpenPositions ? "Posições Abertas" : "Sem Posições"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasOpenPositions 
                  ? `${positionsCount} posição${positionsCount > 1 ? 'ões' : ''} ativa${positionsCount > 1 ? 's' : ''}`
                  : "Nenhuma operação em andamento"
                }
              </p>
            </div>
          </div>

          <div className="text-right">
            <Badge 
              variant={hasOpenPositions ? "default" : "secondary"}
              className={cn(
                "text-xs font-semibold px-3 py-1",
                hasOpenPositions && isProfitable && "bg-green-500 hover:bg-green-600",
                hasOpenPositions && isLoss && "bg-orange-500 hover:bg-orange-600",
                hasOpenPositions && !isProfitable && !isLoss && "bg-blue-500 hover:bg-blue-600"
              )}
            >
              {hasOpenPositions ? "ATIVO" : "INATIVO"}
            </Badge>
            
            {hasOpenPositions && totalUnrealizedPnL !== 0 && (
              <div className="mt-2 flex items-center justify-end gap-1">
                <TrendingUp className={cn(
                  "h-4 w-4",
                  isProfitable ? "text-green-500 rotate-0" : "text-orange-500 rotate-180"
                )} />
                <span className={cn(
                  "text-sm font-semibold",
                  isProfitable ? "text-green-500" : "text-orange-500"
                )}>
                  {isProfitable ? '+' : ''}{totalUnrealizedPnL.toFixed(2)} USDT
                </span>
              </div>
            )}
          </div>
        </div>

        {hasOpenPositions && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status do Alarme</span>
              <span className="font-medium">
                {hasOpenPositions ? "Monitoramento Ativo" : "Desativado"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
