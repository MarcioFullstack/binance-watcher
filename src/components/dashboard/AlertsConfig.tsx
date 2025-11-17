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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Bell, BellOff, TestTube } from "lucide-react";
import { z } from "zod";

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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

        <div className="flex gap-3">
          <Button 
            onClick={testAlerts} 
            variant="outline"
            className="flex-1 border-primary/50 hover:bg-primary/10"
            disabled={testingAlerts || loading}
          >
            {testingAlerts ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Testar Alertas
              </>
            )}
          </Button>

          <Button 
            onClick={handleSave} 
            className="flex-1 bg-primary hover:bg-primary/90 relative overflow-hidden"
            disabled={loading || !!lossPercentError || !!gainPercentError}
          >
            {loading && (
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            )}
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>💾 Salvar</>
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
