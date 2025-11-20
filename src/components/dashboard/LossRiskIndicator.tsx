import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, AlertOctagon, Siren, TrendingDown, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LossRiskIndicatorProps {
  currentLossPercent: number;
  currentLossAmount: number;
  triggeredLevel: {
    level_name: string;
    loss_percentage: number;
  } | null;
  isInLoss: boolean;
}

const levelStyles = {
  warning: {
    icon: AlertCircle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500",
    progress: "bg-yellow-500",
  },
  danger: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500",
    progress: "bg-orange-500",
  },
  critical: {
    icon: AlertOctagon,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500",
    progress: "bg-red-500",
  },
  emergency: {
    icon: Siren,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive",
    progress: "bg-destructive",
  },
};

export const LossRiskIndicator = ({
  currentLossPercent,
  currentLossAmount,
  triggeredLevel,
  isInLoss,
}: LossRiskIndicatorProps) => {
  if (!isInLoss) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-green-500">Conta Segura</h3>
              <p className="text-sm text-muted-foreground">
                Nenhum alerta de perda ativo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const levelName = triggeredLevel?.level_name || 'warning';
  const style = levelStyles[levelName as keyof typeof levelStyles] || levelStyles.warning;
  const Icon = style.icon;

  const levelTitles = {
    warning: "⚠️ Aviso de Perda",
    danger: "🔴 Perda Significativa",
    critical: "🚨 Alerta Crítico",
    emergency: "🆘 EMERGÊNCIA - Ação Imediata!",
  };

  return (
    <Card className={`border-2 ${style.border} ${style.bg} glow-pulse`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${style.color} animate-pulse`} />
            <div>
              <h3 className={`font-semibold ${style.color}`}>
                {levelTitles[levelName as keyof typeof levelTitles]}
              </h3>
              <p className="text-sm text-muted-foreground">
                Alerta acionado em {triggeredLevel?.loss_percentage.toFixed(2)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${style.color}`}>
              -{currentLossPercent.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              ${Math.abs(currentLossAmount).toFixed(2)} USDT
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Nível de Risco</span>
            <span className={style.color}>
              {levelName.toUpperCase()}
            </span>
          </div>
          <Progress 
            value={Math.min(currentLossPercent, 100)} 
            className={`h-3 ${style.progress}`}
          />
        </div>

        {levelName === 'emergency' && (
          <div className={`p-3 rounded-lg ${style.bg} border ${style.border} animate-pulse`}>
            <p className="text-sm font-semibold text-center">
              ⚠️ ATENÇÃO: Considere fechar posições imediatamente para evitar maiores perdas!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
