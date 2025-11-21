import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, AlertCircle, AlertOctagon, Siren, Plus, Trash2, Volume2, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [initialBalance, setInitialBalance] = useState<string>("1000");
  const [sirenType, setSirenType] = useState<string>("police");
  const [showNewAlertDialog, setShowNewAlertDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    level_name: "",
    loss_percentage: 5,
    enabled: true,
    sound_enabled: true,
    visual_alert: true,
    push_notification: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load alert levels
      const { data, error } = await supabase
        .from("loss_alert_levels")
        .select("*")
        .eq("user_id", user.id)
        .order('loss_percentage', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setAlertLevels(data);
      }

      // Load risk settings for initial balance and siren type
      const { data: riskData, error: riskError } = await supabase
        .from("risk_settings")
        .select("initial_balance, siren_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (riskError) throw riskError;
      
      if (riskData?.initial_balance) {
        setInitialBalance(riskData.initial_balance.toString());
      }
      if (riskData?.siren_type) {
        setSirenType(riskData.siren_type);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const balanceValue = parseFloat(initialBalance);
    
    if (isNaN(balanceValue) || balanceValue <= 0) {
      toast.error("Enter a valid initial balance");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // Validar que os percentuais estão em ordem crescente
      const sortedLevels = [...alertLevels].sort((a, b) => a.loss_percentage - b.loss_percentage);
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        if (sortedLevels[i].loss_percentage >= sortedLevels[i + 1].loss_percentage) {
          toast.error("Loss percentages must be unique");
          return;
        }
      }

      // Save alert levels
      const updates = alertLevels.map(level => ({
        ...level,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: alertError } = await supabase
        .from("loss_alert_levels")
        .upsert(updates, { onConflict: 'user_id,level_name' });

      if (alertError) throw alertError;

      // Save risk settings (initial balance and siren type)
      const { error: riskError } = await supabase
        .from("risk_settings")
        .upsert({
          user_id: user.id,
          initial_balance: balanceValue,
          siren_type: sirenType,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (riskError) throw riskError;

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewAlert = async () => {
    if (!newAlert.level_name.trim()) {
      toast.error("Enter a name for the alert level");
      return;
    }

    if (newAlert.loss_percentage <= 0 || newAlert.loss_percentage > 100) {
      toast.error("Porcentagem deve estar entre 0 e 100");
      return;
    }

    // Verificar se já existe um alerta com esse nome
    if (alertLevels.some(level => level.level_name.toLowerCase() === newAlert.level_name.toLowerCase())) {
      toast.error("An alert with this name already exists");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from("loss_alert_levels")
        .insert({
          ...newAlert,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setAlertLevels([...alertLevels, data]);
      setShowNewAlertDialog(false);
      setNewAlert({
        level_name: "",
        loss_percentage: 5,
        enabled: true,
        sound_enabled: true,
        visual_alert: true,
        push_notification: false,
      });
      toast.success("New alert level added!");
    } catch (error: any) {
      console.error("Error adding alert:", error);
      toast.error("Error adding alert level");
    }
  };

  const handleDeleteAlert = async (id: string, levelName: string) => {
    // Não permitir deletar níveis padrão
    const defaultLevels = ['warning', 'danger', 'critical', 'emergency'];
    if (defaultLevels.includes(levelName)) {
      toast.error("Cannot delete default levels. Disable them if you don't want to use them.");
      return;
    }

    try {
      const { error } = await supabase
        .from("loss_alert_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAlertLevels(alertLevels.filter(level => level.id !== id));
      toast.success("Alert level removed!");
    } catch (error: any) {
      console.error("Error deleting alert:", error);
      toast.error("Error removing alert level");
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

    const config = levelConfig[levelName as keyof typeof levelConfig];
    toast.info(`Testando alarme de ${config?.title || levelName}`);
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Siren className="h-6 w-6" />
              Sistema de Alarmes de Perda
            </CardTitle>
            <CardDescription>
              Configure alarmes em múltiplos níveis para proteger seu capital. Cada nível é acionado quando sua perda atinge a porcentagem especificada.
            </CardDescription>
          </div>
          <Dialog open={showNewAlertDialog} onOpenChange={setShowNewAlertDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Alert Level</DialogTitle>
                <DialogDescription>
                  Configure a new custom alert level with your own settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-level-name">Level Name</Label>
                  <Input
                    id="new-level-name"
                    placeholder="E.g: Moderate, High, Extreme"
                    value={newAlert.level_name}
                    onChange={(e) => setNewAlert({ ...newAlert, level_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-loss-percentage">Loss Percentage (%)</Label>
                  <Input
                    id="new-loss-percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newAlert.loss_percentage}
                    onChange={(e) => setNewAlert({ ...newAlert, loss_percentage: parseFloat(e.target.value) })}
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Ativar este alerta</Label>
                    <Switch
                      checked={newAlert.enabled}
                      onCheckedChange={(checked) => setNewAlert({ ...newAlert, enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Som de Alarme</Label>
                    <Switch
                      checked={newAlert.sound_enabled}
                      onCheckedChange={(checked) => setNewAlert({ ...newAlert, sound_enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Alerta Visual</Label>
                    <Switch
                      checked={newAlert.visual_alert}
                      onCheckedChange={(checked) => setNewAlert({ ...newAlert, visual_alert: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Notificação Push</Label>
                    <Switch
                      checked={newAlert.push_notification}
                      onCheckedChange={(checked) => setNewAlert({ ...newAlert, push_notification: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAlertDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddNewAlert}>
                  Adicionar Alerta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configurações Globais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="initial-balance" className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Inicial (USD)
            </Label>
            <Input
              id="initial-balance"
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="Ex: 1000"
            />
            <p className="text-xs text-muted-foreground">
              Base de cálculo para os alarmes de perda percentual
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siren-type" className="text-base font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Tipo de Sirene
            </Label>
            <Select value={sirenType} onValueChange={setSirenType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de sirene" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="police">🚓 Sirene de Polícia</SelectItem>
                <SelectItem value="ambulance">🚑 Sirene de Ambulância</SelectItem>
                <SelectItem value="fire">🚒 Sirene de Bombeiros</SelectItem>
                <SelectItem value="alarm">🔔 Alarme de Prédio</SelectItem>
                <SelectItem value="alert">⚠️ Alerta Agudo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Som padrão para todos os alarmes
            </p>
          </div>
        </div>

        <Separator />

        {alertLevels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Siren className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum alerta configurado. Adicione seu primeiro alerta!</p>
          </div>
        ) : (
          alertLevels.map((level) => {
            const config = levelConfig[level.level_name as keyof typeof levelConfig];
            const Icon = config?.icon || AlertCircle;
            const isDefaultLevel = ['warning', 'danger', 'critical', 'emergency'].includes(level.level_name);

            return (
              <div key={level.id} className={`p-4 rounded-lg border ${config?.bgColor || 'bg-muted/10'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${config?.color || 'text-foreground'}`} />
                    <div>
                      <h3 className="font-semibold">{config?.title || level.level_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config?.description || `Alerta em ${level.loss_percentage}% de perda`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={level.enabled}
                      onCheckedChange={(checked) =>
                        updateLevel(level.level_name, 'enabled', checked)
                      }
                    />
                    {!isDefaultLevel && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAlert(level.id, level.level_name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
                    <Volume2 className="h-4 w-4 mr-2" />
                    Testar Alarme
                  </Button>
                )}
              </div>
            );
          })
        )}

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
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
