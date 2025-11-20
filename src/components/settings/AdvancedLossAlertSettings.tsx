import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, AlertCircle, AlertOctagon, Siren } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AlertLevel {
  id: string;
  level_name: string;
  loss_percentage: number;
  enabled: boolean;
  sound_enabled: boolean;
  visual_alert: boolean;
  push_notification: boolean;
}

const levelConfig = {
  warning: {
    icon: AlertCircle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    title: "⚠️ Aviso",
    description: "Alerta inicial de perda",
  },
  danger: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    title: "🔴 Perigo",
    description: "Perda significativa detectada",
  },
  critical: {
    icon: AlertOctagon,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    title: "🚨 Crítico",
    description: "Perda grave - ação necessária",
  },
  emergency: {
    icon: Siren,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    title: "🆘 Emergência",
    description: "Perda extrema - fechar posições!",
  },
};

export const AdvancedLossAlertSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertLevels, setAlertLevels] = useState<AlertLevel[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("loss_alert_levels")
        .select("*")
        .eq("user_id", user.id)
        .order('loss_percentage', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setAlertLevels(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Validar que os percentuais estão em ordem crescente
      const sortedLevels = [...alertLevels].sort((a, b) => a.loss_percentage - b.loss_percentage);
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        if (sortedLevels[i].loss_percentage >= sortedLevels[i + 1].loss_percentage) {
          toast.error("Os percentuais de perda devem estar em ordem crescente");
          return;
        }
      }

      const updates = alertLevels.map(level => ({
        ...level,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("loss_alert_levels")
        .upsert(updates, { onConflict: 'user_id,level_name' });

      if (error) throw error;

      toast.success("Configurações de alarme salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const updateLevel = (levelName: string, field: keyof AlertLevel, value: any) => {
    setAlertLevels(prev =>
      prev.map(level =>
        level.level_name === levelName
          ? { ...level, [field]: value }
          : level
      )
    );
  };

  const testAlarmForLevel = (levelName: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 2;
    const startTime = audioContext.currentTime;

    const frequencies: { [key: string]: [number, number] } = {
      warning: [600, 800],
      danger: [700, 1000],
      critical: [800, 1200],
      emergency: [900, 1400],
    };

    const [freq1, freq2] = frequencies[levelName] || [700, 1000];

    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.frequency.setValueAtTime(freq1, startTime);
    oscillator2.frequency.setValueAtTime(freq2, startTime);
    gainNode.gain.setValueAtTime(0.6, startTime);

    for (let i = 0; i < 4; i++) {
      const time = startTime + (i * 0.5);
      if (i % 2 === 0) {
        oscillator1.frequency.linearRampToValueAtTime(freq1, time);
        oscillator2.frequency.linearRampToValueAtTime(freq2, time);
      } else {
        oscillator1.frequency.linearRampToValueAtTime(freq2, time);
        oscillator2.frequency.linearRampToValueAtTime(freq1, time);
      }
    }

    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + duration);
    oscillator2.stop(startTime + duration);

    toast.info(`Testando alarme de ${levelConfig[levelName as keyof typeof levelConfig]?.title}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando configurações...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Siren className="h-6 w-6" />
          Sistema de Alarmes de Perda
        </CardTitle>
        <CardDescription>
          Configure alarmes em múltiplos níveis para proteger seu capital. Cada nível é acionado quando sua perda atinge a porcentagem especificada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {alertLevels.map((level) => {
          const config = levelConfig[level.level_name as keyof typeof levelConfig];
          const Icon = config.icon;

          return (
            <div key={level.id} className={`p-4 rounded-lg border ${config.bgColor}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${config.color}`} />
                  <div>
                    <h3 className="font-semibold">{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Switch
                  checked={level.enabled}
                  onCheckedChange={(checked) =>
                    updateLevel(level.level_name, 'enabled', checked)
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`${level.level_name}-percentage`}>
                    Porcentagem de Perda (%)
                  </Label>
                  <Input
                    id={`${level.level_name}-percentage`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={level.loss_percentage}
                    onChange={(e) =>
                      updateLevel(level.level_name, 'loss_percentage', parseFloat(e.target.value))
                    }
                    disabled={!level.enabled}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Som de Alarme</Label>
                    <Switch
                      checked={level.sound_enabled}
                      onCheckedChange={(checked) =>
                        updateLevel(level.level_name, 'sound_enabled', checked)
                      }
                      disabled={!level.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Alerta Visual</Label>
                    <Switch
                      checked={level.visual_alert}
                      onCheckedChange={(checked) =>
                        updateLevel(level.level_name, 'visual_alert', checked)
                      }
                      disabled={!level.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Notificação Push</Label>
                    <Switch
                      checked={level.push_notification}
                      onCheckedChange={(checked) =>
                        updateLevel(level.level_name, 'push_notification', checked)
                      }
                      disabled={!level.enabled}
                    />
                  </div>
                </div>
              </div>

              {level.enabled && level.sound_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testAlarmForLevel(level.level_name)}
                  className="mt-3 w-full"
                >
                  Testar Alarme
                </Button>
              )}
            </div>
          );
        })}

        <Separator />

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
