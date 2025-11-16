import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

export const PnLCards = () => {
  const [pnlData, setPnlData] = useState({
    today: "1.90",
    days7: "-210.93",
    days30: "-185.83",
    total: "-185.83",
    allTimeGains: "185.83",
    allTimePercent: "-653.69"
  });

  useEffect(() => {
    // Mock data - será substituído pela API real da Binance
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Hoje (Realizado)</p>
          <p className="text-2xl font-bold text-success">+{pnlData.today}</p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">7 Dias</p>
          <p className="text-2xl font-bold text-destructive">{pnlData.days7}</p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">30 Dias</p>
          <p className="text-2xl font-bold text-destructive">{pnlData.days30}</p>
        </Card>

        <Card className="p-4 border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Total Acumulado</p>
          <p className="text-2xl font-bold text-destructive">{pnlData.total}</p>
        </Card>
      </div>

      <Card className="p-6 border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">💎 GANHOS E PERDAS DESDE SEMPRE</p>
            <p className="text-3xl font-bold text-destructive">${pnlData.allTimeGains}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">PERCENTUAL</p>
            <p className="text-3xl font-bold text-destructive">{pnlData.allTimePercent}%</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          📊 Somatório de todos os Lucros e Prejuízos de sua conta
        </p>
      </Card>
    </div>
  );
};
