import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Bell, BellOff, TestTube, Volume2, Coins } from "lucide-react";
import { z } from "zod";
import { useAlertSounds } from "@/hooks/useAlertSounds";

const alertPercentSchema = z.object({
  lossPercent: z.string()
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Deve ser um número válido"
    })
    .refine((val) => parseFloat(val) >= 1, {
      message: "O percentual mínimo é 1%"
    })
    .refine((val) => parseFloat(val) <= 50, {
      message: "O percentual máximo é 50%"
    }),
  gainPercent: z.string()
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Deve ser um número válido"
    })
    .refine((val) => parseFloat(val) >= 1, {
      message: "O percentual mínimo é 1%"
    })
    .refine((val) => parseFloat(val) <= 50, {
      message: "O percentual máximo é 50%"
    }),
});

export const AlertsConfig = () => {
  const [loading, setLoading] = useState(false);
  const [lossPercent, setLossPercent] = useState("3");
  const [gainPercent, setGainPercent] = useState("5");
  const [lossEnabled, setLossEnabled] = useState(true);
  const [gainEnabled, setGainEnabled] = useState(true);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [pendingLossEnabled, setPendingLossEnabled] = useState(true);
  const [lossPercentError, setLossPercentError] = useState<string>("");
  const [gainPercentError, setGainPercentError] = useState<string>("");
  const [lossPushNotifications, setLossPushNotifications] = useState(false);
  const [gainPushNotifications, setGainPushNotifications] = useState(false);
  const [testingAlerts, setTestingAlerts] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Ativar sons automáticos quando alertas forem disparados
  useAlertSounds(userId);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from("risk_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setLossPercent(data.risk_percent.toString());
        setLossEnabled(data.risk_active || true);
        setPendingLossEnabled(data.risk_active || true);
        setLossPushNotifications(data.loss_push_notifications || false);
        setGainPushNotifications(data.gain_push_notifications || false);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleLossEnabledChange = (checked: boolean) => {
    if (!checked && lossEnabled) {
      // Tentar desabilitar alerta crítico - mostrar confirmação
      setPendingLossEnabled(false);
      setShowDisableDialog(true);
    } else {
      // Habilitar alerta - não precisa confirmação
      setLossEnabled(checked);
      setPendingLossEnabled(checked);
    }
  };

  const confirmDisableLossAlert = () => {
    setLossEnabled(false);
    setShowDisableDialog(false);
    toast.warning("Alerta de perda desabilitado. Seu capital não está mais protegido! Administradores foram notificados.", {
      duration: 5000,
    });
  };

  const cancelDisableLossAlert = () => {
    setPendingLossEnabled(true);
    setShowDisableDialog(false);
  };

  const handleLossPercentChange = (value: string) => {
    setLossPercent(value);
    setLossPercentError("");
    
    // Validação em tempo real
    if (value) {
      try {
        alertPercentSchema.shape.lossPercent.parse(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setLossPercentError(error.errors[0].message);
        }
      }
    }
  };

  const handleGainPercentChange = (value: string) => {
    setGainPercent(value);
    setGainPercentError("");
    
    // Validação em tempo real
    if (value) {
      try {
        alertPercentSchema.shape.gainPercent.parse(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setGainPercentError(error.errors[0].message);
        }
      }
    }
  };

  const handleSave = async () => {
    // Validar valores antes de salvar
    try {
      alertPercentSchema.parse({
        lossPercent,
        gainPercent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const lossError = error.errors.find(e => e.path[0] === 'lossPercent');
        const gainError = error.errors.find(e => e.path[0] === 'gainPercent');
        
        if (lossError) {
          setLossPercentError(lossError.message);
          toast.error(`Alerta de Perda: ${lossError.message}`);
        }
        if (gainError) {
          setGainPercentError(gainError.message);
          toast.error(`Alerta de Ganho: ${gainError.message}`);
        }
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-alert-config', {
        body: {
          risk_percent: lossPercent,
          risk_active: lossEnabled,
          loss_push_notifications: lossPushNotifications,
          gain_push_notifications: gainPushNotifications,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testAlerts = async () => {
    setTestingAlerts(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-pnl-alerts');

      if (error) throw error;

      if (data) {
        const { checked, alerts_triggered, alerts } = data;
        
        if (alerts_triggered > 0) {
          toast.success(
            `Verificação concluída! ${alerts_triggered} alerta(s) disparado(s)`,
            {
              description: alerts.map((a: any) => a.title).join(', '),
              duration: 5000,
            }
          );
        } else {
          toast.info(
            `Verificação concluída! Nenhum alerta disparado`,
            {
              description: `${checked} usuário(s) verificado(s)`,
              duration: 4000,
            }
          );
        }
      }
    } catch (error: any) {
      toast.error("Erro ao testar alertas: " + (error.message || "Erro desconhecido"));
      console.error(error);
    } finally {
      setTestingAlerts(false);
    }
  };

  const playPoliceSiren = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 3;
    const startTime = audioContext.currentTime;
    
    // Criar osciladores para a sirene
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Frequências iniciais
    oscillator1.frequency.setValueAtTime(800, startTime);
    oscillator2.frequency.setValueAtTime(1200, startTime);
    
    // Volume alto
    gainNode.gain.setValueAtTime(0.7, startTime);
    
    // Criar efeito de sirene alternando frequências
    for (let i = 0; i < duration * 2; i++) {
      const time = startTime + (i * 0.5);
      if (i % 2 === 0) {
        oscillator1.frequency.linearRampToValueAtTime(800, time);
        oscillator2.frequency.linearRampToValueAtTime(1200, time);
      } else {
        oscillator1.frequency.linearRampToValueAtTime(1000, time);
        oscillator2.frequency.linearRampToValueAtTime(900, time);
      }
    }
    
    // Fade out no final
    gainNode.gain.setValueAtTime(0.7, startTime + duration - 0.5);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + duration);
    oscillator2.stop(startTime + duration);
    
    toast.success("🚨 Som de alerta de perda!", {
      duration: 3000,
    });
  };

  const playCoinsSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const startTime = audioContext.currentTime;
    
    // Criar múltiplos tons para simular moedas caindo
    const frequencies = [800, 1000, 1200, 900, 1100, 950];
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Envelope de volume para cada "moeda"
      const coinStart = startTime + (index * 0.15);
      gainNode.gain.setValueAtTime(0, coinStart);
      gainNode.gain.linearRampToValueAtTime(0.3, coinStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, coinStart + 0.3);
      
      oscillator.start(coinStart);
      oscillator.stop(coinStart + 0.3);
    });
    
    // Som adicional de "tinir" usando ruído branco
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.1));
    }
    
    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, startTime);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    noiseGain.gain.setValueAtTime(0.1, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    noise.start(startTime);
    noise.stop(startTime + 0.5);
    
    toast.success("💰 Som de moedas de ganho!", {
      duration: 3000,
    });
  };

  return (
    <Card className={`p-6 border-2 bg-card transition-all duration-300 ${loading ? 'border-primary/50 opacity-80' : 'border-primary'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-primary">Configurar Alertas</h3>
          <p className="text-xs text-muted-foreground">Defina limites de perda e ganho</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Salvando...</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card className={`p-4 border-destructive bg-destructive/10 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="loss-alert" 
              checked={lossEnabled}
              onCheckedChange={handleLossEnabledChange}
              disabled={loading}
            />
            <Label htmlFor="loss-alert" className="text-destructive font-semibold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Alerta de Perda (Crítico)
            </Label>
          </div>
          <Label htmlFor="loss-percent" className="text-sm text-muted-foreground">
            Percentual de perda máximo aceito (%)
          </Label>
          <div className="space-y-2">
            <Input
              id="loss-percent"
              type="number"
              min="1"
              max="50"
              step="0.1"
              value={lossPercent}
              onChange={(e) => handleLossPercentChange(e.target.value)}
              className={`mt-2 bg-background border-destructive ${lossPercentError ? 'border-red-500' : ''}`}
              disabled={!lossEnabled || loading}
            />
            {lossPercentError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lossPercentError}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Será alertado quando sua perda atingir este percentual (Mín: 1%, Máx: 50%)
          </p>
          
          <div className="flex items-center justify-between mt-4 p-3 bg-background rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2">
              {lossPushNotifications ? (
                <Bell className="w-4 h-4 text-destructive" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="loss-push" className="text-sm font-medium cursor-pointer">
                Notificações Push de Perda
              </Label>
            </div>
            <Switch
              id="loss-push"
              checked={lossPushNotifications}
              onCheckedChange={setLossPushNotifications}
              disabled={!lossEnabled || loading}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Bell className="w-3 h-3" />
            Receba alertas em balões no celular ou notebook quando atingir o limite de perda
          </p>
        </Card>

        <Card className={`p-4 border-success bg-success/10 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Checkbox 
              id="gain-alert"
              checked={gainEnabled}
              onCheckedChange={(checked) => setGainEnabled(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="gain-alert" className="text-success font-semibold">
              Alerta de Ganho
            </Label>
          </div>
          <Label htmlFor="gain-percent" className="text-sm text-muted-foreground">
            Percentual de ganho desejado (%)
          </Label>
          <div className="space-y-2">
            <Input
              id="gain-percent"
              type="number"
              min="1"
              max="50"
              step="0.1"
              value={gainPercent}
              onChange={(e) => handleGainPercentChange(e.target.value)}
              className={`mt-2 bg-background border-success ${gainPercentError ? 'border-red-500' : ''}`}
              disabled={!gainEnabled || loading}
            />
            {gainPercentError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {gainPercentError}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            🎯 Será alertado quando seu ganho atingir este percentual (Mín: 1%, Máx: 50%)
          </p>
          
          <div className="flex items-center justify-between mt-4 p-3 bg-background rounded-lg border border-success/20">
            <div className="flex items-center gap-2">
              {gainPushNotifications ? (
                <Bell className="w-4 h-4 text-success" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="gain-push" className="text-sm font-medium cursor-pointer">
                Notificações Push de Ganho
              </Label>
            </div>
            <Switch
              id="gain-push"
              checked={gainPushNotifications}
              onCheckedChange={setGainPushNotifications}
              disabled={!gainEnabled || loading}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Bell className="w-3 h-3" />
            Receba alertas em balões no celular ou notebook quando atingir o ganho desejado
          </p>
        </Card>

        <div className="grid grid-cols-4 gap-2">
          <Button 
            onClick={playPoliceSiren} 
            variant="outline"
            className="border-destructive/50 hover:bg-destructive/10"
            disabled={loading}
            size="sm"
          >
            <Volume2 className="mr-1 h-3 w-3" />
            🚨
          </Button>

          <Button 
            onClick={playCoinsSound} 
            variant="outline"
            className="border-green-500/50 hover:bg-green-500/10"
            disabled={loading}
            size="sm"
          >
            <Coins className="mr-1 h-3 w-3" />
            💰
          </Button>

          <Button 
            onClick={testAlerts} 
            variant="outline"
            className="border-primary/50 hover:bg-primary/10"
            disabled={testingAlerts || loading}
            size="sm"
          >
            {testingAlerts ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TestTube className="h-3 w-3" />
            )}
          </Button>

          <Button 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary/90 relative overflow-hidden"
            disabled={loading || !!lossPercentError || !!gainPercentError}
            size="sm"
          >
            {loading && (
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            )}
            <span className="relative z-10 flex items-center justify-center text-xs">
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "💾"
              )}
            </span>
          </Button>
        </div>
      </div>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Desabilitar Alerta de Perda?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold">
                ⚠️ ATENÇÃO: Você está prestes a desabilitar um alerta crítico de proteção!
              </p>
              <p>
                Ao desabilitar o alerta de perda, você não receberá notificações quando suas perdas atingirem o limite configurado. Isso pode resultar em:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Perda de capital significativa sem aviso prévio</li>
                <li>Dificuldade em controlar o risco das operações</li>
                <li>Possibilidade de liquidação de posições</li>
              </ul>
              <p className="font-semibold text-blue-600">
                📧 Os administradores do sistema serão notificados por email sobre esta ação.
              </p>
              <p className="font-semibold text-destructive">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDisableLossAlert}>
              Cancelar (Recomendado)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisableLossAlert}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Desabilitar Alerta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
