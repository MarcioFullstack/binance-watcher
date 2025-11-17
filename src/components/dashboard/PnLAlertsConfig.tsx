import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingDown, TrendingUp, Volume2, Bell } from "lucide-react";

interface AlertConfig {
  id?: string;
  trigger_type: string;
  threshold: number;
  enabled: boolean;
  sound_enabled: boolean;
  push_enabled: boolean;
}

const ALERT_TYPES = {
  loss: {
    title: "🔴 Alertas de Perda",
    icon: TrendingDown,
    color: "text-destructive",
    triggers: [
      { value: "daily_usdt", label: "Perda Diária (USDT)", placeholder: "Ex: 50" },
      { value: "daily_percent", label: "Perda Diária (%)", placeholder: "Ex: 5" },
      { value: "total_usdt", label: "Perda Total (USDT)", placeholder: "Ex: 200" },
      { value: "total_percent", label: "Perda Total (%)", placeholder: "Ex: 10" },
      { value: "unrealized_usdt", label: "PnL Não Realizado Negativo (USDT)", placeholder: "Ex: 100" },
    ],
  },
  gain: {
    title: "🟢 Alertas de Ganho",
    icon: TrendingUp,
    color: "text-success",
    triggers: [
      { value: "daily_usdt", label: "Ganho Diário (USDT)", placeholder: "Ex: 100" },
      { value: "daily_percent", label: "Ganho Diário (%)", placeholder: "Ex: 10" },
      { value: "total_usdt", label: "Ganho Total (USDT)", placeholder: "Ex: 500" },
      { value: "total_percent", label: "Ganho Total (%)", placeholder: "Ex: 20" },
      { value: "unrealized_usdt", label: "PnL Não Realizado Positivo (USDT)", placeholder: "Ex: 200" },
    ],
  },
};

export const PnLAlertsConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lossAlerts, setLossAlerts] = useState<Record<string, AlertConfig>>({});
  const [gainAlerts, setGainAlerts] = useState<Record<string, AlertConfig>>({});

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pnl_alert_configs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const lossAlertsMap: Record<string, AlertConfig> = {};
      const gainAlertsMap: Record<string, AlertConfig> = {};

      data?.forEach((alert) => {
        const config: AlertConfig = {
          id: alert.id,
          trigger_type: alert.trigger_type,
          threshold: alert.threshold,
          enabled: alert.enabled,
          sound_enabled: alert.sound_enabled,
          push_enabled: alert.push_enabled,
        };

        if (alert.alert_type === 'loss') {
          lossAlertsMap[alert.trigger_type] = config;
        } else {
          gainAlertsMap[alert.trigger_type] = config;
        }
      });

      setLossAlerts(lossAlertsMap);
      setGainAlerts(gainAlertsMap);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Preparar dados para upsert
      const alertsToSave = [
        ...Object.entries(lossAlerts).map(([trigger_type, config]) => ({
          ...config,
          user_id: user.id,
          alert_type: 'loss',
          trigger_type,
        })),
        ...Object.entries(gainAlerts).map(([trigger_type, config]) => ({
          ...config,
          user_id: user.id,
          alert_type: 'gain',
          trigger_type,
        })),
      ].filter((alert) => alert.threshold > 0);

      // Upsert configurations
      const { error } = await supabase
        .from('pnl_alert_configs')
        .upsert(alertsToSave, {
          onConflict: 'user_id,alert_type,trigger_type',
        });

      if (error) throw error;

      toast.success('Alertas salvos com sucesso!');
      await loadAlerts();
    } catch (error: any) {
      console.error('Error saving alerts:', error);
      toast.error('Erro ao salvar alertas');
    } finally {
      setSaving(false);
    }
  };

  const updateAlert = (
    alertType: 'loss' | 'gain',
    triggerType: string,
    field: keyof AlertConfig,
    value: any
  ) => {
    const setter = alertType === 'loss' ? setLossAlerts : setGainAlerts;
    const alerts = alertType === 'loss' ? lossAlerts : gainAlerts;

    setter({
      ...alerts,
      [triggerType]: {
        ...(alerts[triggerType] || {
          trigger_type: triggerType,
          threshold: 0,
          enabled: false,
          sound_enabled: true,
          push_enabled: false,
        }),
        [field]: value,
      },
    });
  };

  const renderAlertSection = (alertType: 'loss' | 'gain') => {
    const config = ALERT_TYPES[alertType];
    const alerts = alertType === 'loss' ? lossAlerts : gainAlerts;
    const Icon = config.icon;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle>{config.title}</CardTitle>
          </div>
          <CardDescription>
            Configure até 5 tipos diferentes de alertas de {alertType === 'loss' ? 'perda' : 'ganho'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.triggers.map((trigger) => {
            const alert = alerts[trigger.value] || {
              trigger_type: trigger.value,
              threshold: 0,
              enabled: false,
              sound_enabled: true,
              push_enabled: false,
            };

            return (
              <div key={trigger.value} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{trigger.label}</Label>
                  <Switch
                    checked={alert.enabled}
                    onCheckedChange={(checked) =>
                      updateAlert(alertType, trigger.value, 'enabled', checked)
                    }
                  />
                </div>

                {alert.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Valor do Alerta</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={trigger.placeholder}
                        value={alert.threshold || ''}
                        onChange={(e) =>
                          updateAlert(alertType, trigger.value, 'threshold', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Som</Label>
                        <Switch
                          checked={alert.sound_enabled}
                          onCheckedChange={(checked) =>
                            updateAlert(alertType, trigger.value, 'sound_enabled', checked)
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Push</Label>
                        <Switch
                          checked={alert.push_enabled}
                          onCheckedChange={(checked) =>
                            updateAlert(alertType, trigger.value, 'push_enabled', checked)
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {renderAlertSection('loss')}
      <Separator />
      {renderAlertSection('gain')}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  );
};
