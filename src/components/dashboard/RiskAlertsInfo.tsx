import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info } from "lucide-react";

export const RiskAlertsInfo = () => {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('riskAlerts.title')}</CardTitle>
        </div>
        <CardDescription>{t('riskAlerts.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{t('riskAlerts.level70')}</p>
              <p className="text-xs text-muted-foreground">{t('riskAlerts.level70Desc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/30">
            <span className="text-xl">🔴</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{t('riskAlerts.level85')}</p>
              <p className="text-xs text-muted-foreground">{t('riskAlerts.level85Desc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            <span className="text-xl">🚨</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{t('riskAlerts.level95')}</p>
              <p className="text-xs text-muted-foreground">{t('riskAlerts.level95Desc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-destructive/20 rounded-lg border border-destructive/40">
            <span className="text-xl">🚨</span>
            <div className="flex-1">
              <p className="font-medium text-sm text-destructive">{t('riskAlerts.level100')}</p>
              <p className="text-xs text-muted-foreground">{t('riskAlerts.level100Desc')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">{t('riskAlerts.info')}</p>
        </div>
      </CardContent>
    </Card>
  );
};
