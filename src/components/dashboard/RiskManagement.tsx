import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { BinanceData } from "@/hooks/useBinanceData";

interface RiskManagementProps {
  data: BinanceData;
}

export const RiskManagement = ({ data }: RiskManagementProps) => {
  const riskLimitPercent = parseFloat(data.risk.riskLimitPercent);
  const maxRiskPercent = data.risk.riskPercent;
  const currentLoss = parseFloat(data.risk.currentLoss);
  const maxAllowedLoss = parseFloat(data.risk.maxAllowedLoss);
  const totalPnLPercent = parseFloat(data.pnl.totalPercent);
  
  const riskProgressValue = Math.min((riskLimitPercent / maxRiskPercent) * 100, 100);
  const isHighRisk = riskLimitPercent > maxRiskPercent * 0.7;
  const isCriticalRisk = data.risk.hasReachedLimit;

  return (
    <Card className={`${isCriticalRisk ? 'border-destructive' : isHighRisk ? 'border-warning' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isCriticalRisk ? (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              ) : isHighRisk ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              )}
              Gestão de Risco
            </CardTitle>
            <CardDescription>
              Monitoramento de perda baseado na banca inicial
            </CardDescription>
          </div>
          {totalPnLPercent >= 0 ? (
            <TrendingUp className="h-6 w-6 text-success" />
          ) : (
            <TrendingDown className="h-6 w-6 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Banca Inicial vs Atual */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Banca Inicial</span>
            <span className="font-bold">{parseFloat(data.balance.initial).toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Banca Atual</span>
            <span className="font-bold">{parseFloat(data.balance.total).toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Variação Total</span>
            <span className={`font-bold ${totalPnLPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnLPercent >= 0 ? '+' : ''}{data.pnl.totalFromInitial} USDT ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Saldo Disponível vs Usado */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo Livre</span>
            <span className="font-medium text-success">{parseFloat(data.balance.available).toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usado em Posições</span>
            <span className="font-medium text-warning">{parseFloat(data.balance.used).toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Limite de Risco */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Limite de Perda Configurado</span>
            <span className="font-bold text-destructive">{maxRiskPercent}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Perda Máxima Permitida</span>
            <span className="font-bold text-destructive">{maxAllowedLoss.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Perda Atual</span>
            <span className={`font-bold ${isCriticalRisk ? 'text-destructive' : 'text-warning'}`}>
              {currentLoss.toFixed(2)} USDT ({riskLimitPercent.toFixed(2)}%)
            </span>
          </div>
          
          <div className="space-y-2 pt-2">
            <Progress 
              value={riskProgressValue} 
              className={`h-3 ${isCriticalRisk ? 'bg-destructive/20' : isHighRisk ? 'bg-warning/20' : ''}`}
            />
            <p className="text-xs text-center text-muted-foreground">
              {isCriticalRisk ? (
                <span className="text-destructive font-bold">🚨 LIMITE ATINGIDO - Considere fechar posições!</span>
              ) : riskLimitPercent >= 95 ? (
                <span className="text-destructive font-bold">🚨 CRÍTICO - 95% do limite atingido</span>
              ) : riskLimitPercent >= 85 ? (
                <span className="text-warning font-bold">🔴 ATENÇÃO - 85% do limite atingido</span>
              ) : riskLimitPercent >= 70 ? (
                <span className="text-warning font-medium">⚠️ ALERTA - 70% do limite atingido</span>
              ) : isHighRisk ? (
                <span className="text-warning font-medium">⚠️ Aproximando-se do limite de risco</span>
              ) : (
                <span>Operando dentro do limite de risco</span>
              )}
            </p>
          </div>
        </div>

        {/* Alertas de Risco Progressivos */}
        {riskLimitPercent >= 70 && !isCriticalRisk && (
          <div className={`${
            riskLimitPercent >= 95 ? 'bg-destructive/10 border-destructive/20' :
            riskLimitPercent >= 85 ? 'bg-warning/10 border-warning/20' :
            'bg-warning/5 border-warning/10'
          } border rounded-lg p-3`}>
            <p className={`text-sm font-medium ${
              riskLimitPercent >= 95 ? 'text-destructive' :
              riskLimitPercent >= 85 ? 'text-warning' :
              'text-warning'
            }`}>
              {riskLimitPercent >= 95 ? '🚨 Nível Crítico de Risco!' :
               riskLimitPercent >= 85 ? '🔴 Atenção ao Nível de Risco' :
               '⚠️ Alerta de Risco'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {riskLimitPercent >= 95 ? 'Você está a apenas 5% do limite configurado. Considere reduzir exposição.' :
               riskLimitPercent >= 85 ? 'Você atingiu 85% do seu limite de perda. Revise suas posições.' :
               'Você atingiu 70% do seu limite de perda. Mantenha atenção às suas posições.'}
            </p>
          </div>
        )}

        {/* Alerta de Posições Críticas */}
        {data.risk.hasCritical && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive">
              ⚠️ {data.risk.criticalCount} posição(ões) com margem crítica
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monitore de perto para evitar liquidação
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
